import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import * as mercadopago from 'mercadopago';
import { DataSource, QueryFailedError, QueryRunner, Repository } from 'typeorm';
import { TokenPayloadDTO } from '../auth/dto/token-payload.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { EmailService } from '../email/email.service';
import { Items } from '../orders/entities/items.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/order.service';
import { Product } from '../products/entities/product.entity';
import { GetErrorMessage } from '../utils/error-message.util';
import mercadopagoConfig from './config/mercadopago.config';
import { CancelDTO } from './dto/cancel.dto';
import { CreateCheckoutDto } from './dto/create-preference.dto';
import { OrderDTO } from './dto/order.dto';
import { PartialRefundDTO } from './dto/partial-refund.dto';
import { PartialRefundItemDTO } from './dto/refund-item.dto';
import { RefundDTO } from './dto/refund.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private client: mercadopago.MercadoPagoConfig;
  private preference: mercadopago.Preference;
  private paymentClient: mercadopago.Payment;
  private paymentRefundClient: mercadopago.PaymentRefund;

  constructor(
    @Inject(mercadopagoConfig.KEY)
    private readonly mercadoPagoConfiguration: ConfigType<
      typeof mercadopagoConfig
    >,

    @InjectRepository(Items)
    private readonly ItemsRepository: Repository<Items>,
    private readonly ordersService: OrdersService,
    private readonly emailsService: EmailService,
    private dataSource: DataSource,
  ) {
    this.client = new mercadopago.MercadoPagoConfig({
      accessToken: mercadoPagoConfiguration.accessToken,
      options: { timeout: 5000 },
    });

    this.paymentClient = new mercadopago.Payment(this.client);

    this.paymentRefundClient = new mercadopago.PaymentRefund(this.client);

    this.preference = new mercadopago.Preference(this.client);
  }

  async RefundOrder(
    orderId: string,
    refundDTO: RefundDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para estornar pedidos',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doesOrderReallyExists = await queryRunner.manager.findOne(Order, {
        where: {
          id: orderId,
        },
        relations: {
          items: true,
        },
        select: {
          items: {
            product: true,
          },
        },
      });

      if (!doesOrderReallyExists) {
        throw new NotFoundException(`Pedido ${orderId} não encontrado`);
      }

      for (const item of doesOrderReallyExists.items) {
        const findProduct = await queryRunner.manager.findOne(Product, {
          where: {
            id: item.product.id,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!findProduct) {
          throw new NotFoundException(
            `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
          );
        }

        const updatedProductQuantity = (findProduct.quantity += item.quantity);

        const updateProductQuantity = await queryRunner.manager.update(
          Product,
          findProduct.id,
          {
            quantity: updatedProductQuantity,
          },
        );

        if (!updateProductQuantity || updateProductQuantity.affected < 1) {
          throw new InternalServerErrorException(
            `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
          );
        }
      }

      await queryRunner.manager.update(Order, orderId, {
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: refundDTO.reasonCode,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`✅ Devolução total processada: Order ${orderId}`);

      // amount
      // função completa com switch e if para variações (DRY)
      const returnObject = {
        amount: 0,
        orderId,
      };

      this.emailsService.SendRefundProcessedEmail(findOrder, false);
      this.emailsService.SendRefundProcessedEmail(findOrder, true);

      return returnObject;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const manageError = GetErrorMessage(error);

      this.logger.error(
        `Erro na devolução: ${manageError}`,
        error instanceof Error ? error.stack : null,
      );

      if (error instanceof QueryFailedError) {
        throw new InternalServerErrorException(
          'Erro na atualização dos dados da devolução',
        );
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();

        if (status >= 500) {
          throw new InternalServerErrorException(
            'Erro interno ao processar devolução',
          );
        }

        throw error;
      }

      throw new InternalServerErrorException('Erro ao processar devolução');
    } finally {
      await queryRunner.release();
    }
  }

  async RefundOrderPartial(
    orderId: string,
    partialRefundDTO: PartialRefundDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para estornar este pedido',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doesOrderReallyExists = await queryRunner.manager.findOne(Order, {
        where: {
          id: orderId,
        },
        relations: {
          items: true,
        },
        select: {
          items: {
            product: true,
          },
        },
      });

      if (!doesOrderReallyExists) {
        throw new NotFoundException('Pedido não encontrado');
      }

      const refundDetails = await this.ValidateAndCalculateRefund(
        doesOrderReallyExists,
        partialRefundDTO.items,
        queryRunner,
      );

      for (const item of partialRefundDTO.items) {
        const findProduct = await queryRunner.manager.findOne(Product, {
          where: {
            id: item.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!findProduct) {
          throw new NotFoundException(
            `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
          );
        }

        const updatedProductQuantity = (findProduct.quantity += item.quantity);

        const updateProductQuantity = await queryRunner.manager.update(
          Product,
          findProduct.id,
          {
            quantity: updatedProductQuantity,
          },
        );

        if (!updateProductQuantity || updateProductQuantity.affected < 1) {
          throw new InternalServerErrorException(
            `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
          );
        }
      }

      const refundTotal = new Decimal(doesOrderReallyExists.refundAmount);
      const totalAmount = new Decimal(refundDetails.totalAmount);

      const compare = refundTotal.greaterThan(totalAmount);

      if (compare !== true) {
        await queryRunner.manager.update(Order, doesOrderReallyExists.id, {
          status: OrderStatus.REFUNDED,
          refundAmount: totalAmount.toString(),
        });
      } else {
        const sumValues = refundTotal.add(totalAmount);

        await queryRunner.manager.update(Order, doesOrderReallyExists.id, {
          status: OrderStatus.PARTIAL_REFUND,
          refundAmount: sumValues.toString(),
        });
      }

      await queryRunner.commitTransaction();

      const returnObject = {
        amount: totalAmount.toNumber(),
        orderId,
        itemsRefunded: refundDetails.items.length,
        details: refundDetails.items.map((item) => {
          const items = {
            productName: item.item.product_name,
            quantity: item.item.quantity,
            amount: item.amount,
          };

          return items;
        }),
      };

      this.emailsService.SendPartialRefundEmail(
        findOrder,
        returnObject.amount,
        false,
        returnObject.details,
      );

      this.emailsService.SendPartialRefundEmail(
        findOrder,
        returnObject.amount,
        true,
        returnObject.details,
      );

      this.logger.log(
        `✅ Estorno parcial processado: Pedido ${orderId} - Total R$ ${refundDetails.totalAmount}`,
      );

      return returnObject;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const manageError = GetErrorMessage(error);

      this.logger.error(`Erro na devolução parcial: ${manageError}`);

      if (error instanceof QueryFailedError) {
        throw new InternalServerErrorException(
          'Erro nas atualizações de dados de devolução parcial',
        );
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();

        if (status >= 500) {
          throw new InternalServerErrorException(
            'Erro interno ao processar devolução parcial',
          );
        }

        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao processar devolução parcial',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async ValidateAndCalculateRefund(
    order: Order,
    refundItems: PartialRefundItemDTO[],
    queryRunner: QueryRunner,
  ) {
    const refundDetails = {
      totalAmount: new Decimal(0),
      items: [] as Array<{
        item: Items;
        quantity: number;
        amount: number;
      }>,
    };

    for (const refundItem of refundItems) {
      const orderItem = await queryRunner.manager.findOne(Items, {
        where: {
          id: refundItem.orderItemId,
          order: { id: order.id }, // Garantir que pertence a este pedido
        },
        relations: {
          product: true,
        },
      });

      if (!orderItem) {
        throw new NotFoundException(
          `Item ${refundItem.product_name}, de id ${refundItem.orderItemId} do pedido ${order.id} não encontrado`,
        );
      }

      if (refundItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Quantidade de devolução (${refundItem.quantity}) ` +
            `maior que quantidade comprada (${orderItem.quantity}) ` +
            `para produto ${orderItem.product.name}`,
        );
      }

      const itemPrice = new Decimal(orderItem.price);
      const itemRefundAmount = itemPrice.mul(refundItem.quantity);

      refundDetails.items.push({
        item: orderItem,
        quantity: refundItem.quantity,
        amount: itemRefundAmount.toNumber(),
      });

      refundDetails.totalAmount =
        refundDetails.totalAmount.add(itemRefundAmount);
    }

    return {
      totalAmount: refundDetails.totalAmount.toNumber(),
      items: refundDetails.items,
    };
  }

  async CancelOrder(
    orderId: string,
    cancelDTO: CancelDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findOrder = await this.ordersService.FindById(orderId);
    const returnObject = {
      orderId,
      status: 'cancelled',
      message: 'Pedido cancelado com sucesso',
    };

    if (
      findOrder.user.id !== tokenPayloadDTO.sub &&
      !tokenPayloadDTO.role?.includes('admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para estornar este pedido',
      );
    }

    if (
      findOrder.status !== OrderStatus.WAITING_PAYMENT &&
      findOrder.status !== OrderStatus.IN_PROCESS
    ) {
      throw new BadRequestException(
        'Só é possível cancelar pagamentos pendentes ou em processo',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doesOrderReallyExists = await queryRunner.manager.findOne(Order, {
        where: {
          id: orderId,
        },
        relations: {
          items: true,
        },
        select: {
          items: {
            product: true,
          },
        },
      });

      if (!doesOrderReallyExists) {
        throw new NotFoundException('Pedido não encontrado');
      }

      await this.paymentClient.cancel({
        id: doesOrderReallyExists.paymentId,
      });

      for (const item of doesOrderReallyExists.items) {
        const findProduct = await queryRunner.manager.findOne(Product, {
          where: {
            id: item.product.id,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!findProduct) {
          throw new NotFoundException(
            `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
          );
        }

        const updatedProductQuantity = (findProduct.quantity += item.quantity);

        const updateProductQuantity = await queryRunner.manager.update(
          Product,
          findProduct.id,
          {
            quantity: updatedProductQuantity,
          },
        );

        if (!updateProductQuantity || updateProductQuantity.affected < 1) {
          throw new InternalServerErrorException(
            `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
          );
        }
      }

      await queryRunner.manager.update(Order, orderId, {
        status: OrderStatus.CANCELED,
        cancelReason: cancelDTO.reason,
        canceledAt: new Date(),
      });

      // await this.emailsService.SendOrderCanceledEmail(
      //   findOrder,
      //   false,
      //   cancelDTO.reason,
      // );

      this.logger.log(`✅ Pedido cancelado: ${orderId}`);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const manageError = GetErrorMessage(error);

      this.logger.error(`Erro ao cancelar pedido: ${manageError}`);

      if (error instanceof QueryFailedError) {
        throw new InternalServerErrorException(
          'Erro ao atualizar dados do pedido cancelado',
        );
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();

        if (status >= 500) {
          throw new InternalServerErrorException(
            'Erro interno ao cancelar pedido',
          );
        }

        throw error;
      }

      throw new InternalServerErrorException('Erro ao cancelar pedido');
    } finally {
      await queryRunner.release();
    }

    return returnObject;
  }

  // private ValidateRefundEligibility(order: Order) {
  //   if (order.status !== OrderStatus.APPROVED) {
  //     throw new BadRequestException('Só é possível estornar pedidos aprovados');
  //   }

  //   const daysSincePaid = Math.floor(
  //     (Date.now() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24),
  //   );

  //   if (daysSincePaid > 180) {
  //     throw new BadRequestException(
  //       'Prazo para estorno expirado (máximo 180 dias)',
  //     );
  //   }
  // }

  async CreateCheckout(orderDTO: OrderDTO, tokenPayloadDTO: TokenPayloadDTO) {
    try {
      const { orderItems } = orderDTO;

      const createOrder = await this.ordersService.Create(
        orderItems,
        tokenPayloadDTO,
      );

      const ipData: CreateCheckoutDto = {
        handle: 'tag',
        redirect_url: 'url',
        order_nsu: createOrder.orderId,
        customer: {
          name: createOrder.payer.name,
          email: createOrder.payer.email,
        },
        items: [...createOrder.items],
      };

      // trocar orderDTO pelo objeto completo esperado pelo infinitepay em body
      const res = await fetch(
        'https://api.infinitepay.io/invoices/public/checkout/links',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ipData),
        },
      );

      // Verficar errorData se não expõe nenhum dado sensível
      if (!res.ok) {
        const errorData = await res.json();

        throw new HttpException(
          errorData.message || 'Erro na transação',
          res.status,
        );
      }

      const response = await res.json();

      return response;
    } catch (error) {
      const manageError = GetErrorMessage(error);

      this.logger.error(
        `Erro no checkout: ${manageError}`,
        error instanceof Error ? error.stack : null,
      );

      if (error instanceof QueryFailedError) {
        throw new InternalServerErrorException(
          'Erro ao criar registros do checkout',
        );
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();

        if (status >= 500) {
          throw new InternalServerErrorException(
            'Erro interno ao criar checkout',
          );
        }

        throw error;
      }

      throw new InternalServerErrorException('Erro ao criar checkout');
    }
  }

  // private translateMPError(errorMessage: string): string {
  //   const errors = {
  //     payment_too_old_to_be_refunded:
  //       'Pagamento muito antigo para estorno (máx 180 dias)',
  //     refund_not_found: 'Estorno não encontrado',
  //     invalid_payment_status_to_refund:
  //       'Status do pagamento não permite estorno',
  //     insufficient_amount: 'Saldo insuficiente na conta Mercado Pago',
  //   };

  //   for (const [key, message] of Object.entries(errors)) {
  //     if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
  //       return message;
  //     }
  //   }

  //   return 'Erro ao processar operação no Mercado Pago';
  // }
}
