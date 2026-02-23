import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { EmailService } from 'src/email/email.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { Product } from 'src/products/entities/product.entity';
import { UsersService } from 'src/users/user.service';
import { DataSource, LessThan, Repository } from 'typeorm';
import { CreateOrderItemDTO } from './dto/create-item.dto';
import { PaginationAllOrdersDTO } from './dto/pagination-all-orders.dto';
import { PaginationByPriceDTO } from './dto/pagination-by-price.dto';
import { PaginationByUserDTO } from './dto/pagination-by-user.dto';
import { PaginationByStatusDTO } from './dto/pagination-order-status.dto';
import { PaginationDTO } from './dto/pagination-order.dto';
import { Items } from './entities/items.entity';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    private readonly logger: Logger,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async Create(
    createOrderItemDTO: CreateOrderItemDTO[],
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let findUser: Employee;
    let newOrderData: Order;
    let findProduct: Product;
    let sendEmail = false;
    const itemsFromThisOrder: Items[] = [];

    try {
      const decimal = createOrderItemDTO.reduce(
        (sum, item) => sum.add(item.price),
        new Decimal(0),
      );

      findUser = await queryRunner.manager.findOne(Employee, {
        where: {
          id: tokenPayloadDTO.sub,
        },
      });

      if (!findUser) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const orderData = {
        total_price: decimal.toString(),
        user: findUser,
        items: [],
        status: OrderStatus.PENDING,
        paidAt: null,
      };

      const orderCreate = queryRunner.manager.create(Order, orderData);

      newOrderData = await queryRunner.manager.save(orderCreate);

      for (let i = 0; i < createOrderItemDTO.length; i++) {
        findProduct = await queryRunner.manager.findOne(Product, {
          where: {
            id: createOrderItemDTO[i].product.id,
          },
          loadEagerRelations: false,
          lock: { mode: 'pessimistic_write' },
        });

        if (!findProduct) {
          throw new NotFoundException('Produto não encontrado');
        }

        const itemData = {
          product_name: createOrderItemDTO[i].product_name,
          quantity: createOrderItemDTO[i].quantity,
          price: createOrderItemDTO[i].price,
          order: newOrderData,
          product: findProduct,
        };

        const { quantity, lowStock } = findProduct;

        switch (true) {
          case quantity < 1:
            throw new BadRequestException(
              `Produto ${findProduct.name} esgotado`,
            );

          case createOrderItemDTO[i].quantity > quantity:
            throw new BadRequestException(
              `Estoque do produto  ${findProduct.name} insuficiente`,
            );

          case quantity <= lowStock &&
            quantity >= createOrderItemDTO[i].quantity:
            sendEmail = true;
            break;
        }

        const quantityUpdate =
          findProduct.quantity - createOrderItemDTO[i].quantity;

        const productQuantityUpdate = await queryRunner.manager.update(
          Product,
          findProduct.id,
          {
            quantity: quantityUpdate,
          },
        );

        if (!productQuantityUpdate || productQuantityUpdate.affected < 1) {
          throw new InternalServerErrorException(
            `Erro ao atualizar quantidade do produto ${createOrderItemDTO[i].product_name}`,
          );
        }

        const orderItemCreate = queryRunner.manager.create(Items, itemData);

        itemsFromThisOrder.push(orderItemCreate);
      }

      await queryRunner.manager.save(Items, itemsFromThisOrder);

      await queryRunner.commitTransaction();

      if (sendEmail === true) await this.emailService.LowStockWarn(findProduct);

      const createPreferenceObject =
        this.ReturnItemsMPObject(itemsFromThisOrder);

      return {
        items: createPreferenceObject,
        payer: {
          email: findUser.email,
          name: findUser.name,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Erro ao criar pedido e atualizar dados do produto: ${error.message}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação na criação de pedido e atualização de dados do produto',
      );
    } finally {
      await queryRunner.release();
    }
  }

  ReturnItemsMPObject(items: Items[]) {
    const itemsList = [];
    for (let i = 0; i < items.length; i++) {
      itemsList.push({
        id: items[i].id,
        title: items[i].product_name,
        quantity: items[i].quantity,
        currency_id: 'BRL',
        unit_price: new Decimal(items[i].price).toDecimalPlaces(2).toNumber(),
      });
    }

    return itemsList;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async StockRelease() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await this.ordersRepository.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(thirtyMinutesAgo),
      },
      relations: ['items', 'items.product'],
    });

    if (!expiredOrders) {
      throw new InternalServerErrorException(
        'Erro ao buscar pedidos pendentes',
      );
    }

    if (expiredOrders.length < 1) {
      this.logger.log('✅ Nenhuma reserva expirada');
      return;
    }

    this.logger.log(`📋 Processando ${expiredOrders.length} pedidos expirados`);

    for (const order of expiredOrders) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const doesExpiredOrderReallyExists = await queryRunner.manager.findOne(
          Order,
          {
            where: {
              id: order.id,
              status: OrderStatus.PENDING,
              createdAt: LessThan(thirtyMinutesAgo),
            },
            relations: ['items', 'items.product'],
          },
        );

        if (!doesExpiredOrderReallyExists) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`❌ Pedido ${order.id} não encontrado`);
          continue;
        }

        // Liberar estoque
        for (const item of doesExpiredOrderReallyExists.items) {
          const findProduct = await queryRunner.manager.findOne(Product, {
            where: {
              id: item.product.id,
            },
            lock: { mode: 'pessimistic_write' },
          });

          // Sem rollback nem release aqui. Só pode um de cada para cada query runner
          if (!findProduct) {
            throw new NotFoundException(
              `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
            );
          }

          const returnedQuantity = await queryRunner.manager.increment(
            Product,
            { id: findProduct.id },
            'quantity',
            item.quantity,
          );

          if (!returnedQuantity || returnedQuantity.affected < 1) {
            throw new InternalServerErrorException(
              `Erro ao tentar devolver unidades de produto ${item.product_name} ao estoque`,
            );
          }
        }

        // Cancelar pedido
        await queryRunner.manager.update(Order, order.id, {
          status: OrderStatus.CANCELED,
          cancelReason: 'Expirado (30 minutos sem pagamento)',
          canceledAt: new Date(),
        });

        await queryRunner.commitTransaction();

        this.logger.log(`✅ Pedido ${order.id} expirado e liberado`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`❌ Erro no pedido ${order.id}`, error);
      } finally {
        await queryRunner.release();
      }
    }
  }

  async FindById(id: string) {
    const orderFindById = await this.ordersRepository.findOne({
      where: {
        id,
      },
      relations: {
        items: true,
        user: true,
      },
    });

    if (!orderFindById) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return orderFindById;
  }

  async ListOrdersEmployees(paginationAllOrders?: PaginationAllOrdersDTO) {
    const { limit, offset } = paginationAllOrders;

    const [findAll, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
    });

    return [total, ...findAll];
  }

  async ListOrdersUsers(
    tokenPayloadDTO: TokenPayloadDTO,
    paginationAllOrders?: PaginationAllOrdersDTO,
  ) {
    const findUser = await this.usersService.FindById(tokenPayloadDTO.sub);

    if (!findUser) {
      throw new UnauthorizedException('Ação não permitida');
    }

    const { limit, offset } = paginationAllOrders;

    const [findAll, total] = await this.ordersRepository.findAndCount({
      where: {
        user: findUser,
      },
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
    });

    return [total, ...findAll];
  }

  async FindByPriceEmployees(paginationByPriceDTO: PaginationByPriceDTO) {
    const { limit, offset, value } = paginationByPriceDTO;

    const [orderFindByName, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        total_price: value,
      },
    });

    if (!orderFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByName.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByName];
  }

  async FindByPriceUsers(
    paginationByPriceDTO: PaginationByPriceDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findUser = await this.usersService.FindById(tokenPayloadDTO.sub);

    if (!findUser) {
      throw new UnauthorizedException('Ação não permitida');
    }

    const { limit, offset, value } = paginationByPriceDTO;

    const [orderFindByName, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        total_price: value,
        user: findUser,
      },
    });

    if (!orderFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByName.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByName];
  }

  async FindByItemEmployees(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const [orderFindByName, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        items: {
          product_name: value,
        },
      },
    });

    if (!orderFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByName.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByName];
  }

  async FindByItemUsers(
    paginationDTO: PaginationDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const findUser = await this.usersService.FindById(tokenPayloadDTO.sub);

    if (!findUser) {
      throw new UnauthorizedException('Ação não permitida');
    }

    const { limit, offset, value } = paginationDTO;

    const [orderFindByName, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        items: {
          product_name: value,
        },
        user: findUser,
      },
    });

    if (!orderFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByName.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByName];
  }

  async FindByStatus(paginationByStatusDTO: PaginationByStatusDTO) {
    const { limit, offset, value } = paginationByStatusDTO;

    const [orderFindByStatus, total] = await this.ordersRepository.findAndCount(
      {
        take: limit,
        skip: offset,
        order: {
          id: 'desc',
        },
        where: {
          status: value,
        },
      },
    );

    if (!orderFindByStatus) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByStatus.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByStatus];
  }

  async FindByUser(paginationByUserDTO: PaginationByUserDTO) {
    const { limit, offset, value } = paginationByUserDTO;

    const [orderFindByUser, total] = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        user: {
          id: value,
        },
      },
      relations: {
        user: true,
      },
      select: {
        user: {
          id: true,
          name: true,
          email: true,
        },
      },
    });

    if (!orderFindByUser) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByUser.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return [total, ...orderFindByUser];
  }
}
