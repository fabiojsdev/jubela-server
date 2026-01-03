import {
  forwardRef,
  Inject,
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
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Product } from 'src/products/entities/product.entity';
import { ProductsService } from 'src/products/product.service';
import { UsersService } from 'src/users/user.service';
import { LessThan, Repository } from 'typeorm';
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

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Items)
    private readonly orderItemsRepository: Repository<Items>,
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly logger: Logger,
  ) {}

  async Create(
    createOrderItemDTO: CreateOrderItemDTO[],
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const decimal = new Decimal(0);

    for (let i = 0; i < createOrderItemDTO.length; i++) {
      decimal.add(createOrderItemDTO[i].price);
    }

    const findUser = await this.usersService.FindById(tokenPayloadDTO.sub);

    const orderData = {
      total_price: decimal.toString(),
      user: findUser,
      items: [],
      status: OrderStatus.PENDING,
      paidAt: null,
    };

    const orderCreate = this.ordersRepository.create(orderData);

    const newOrderData = await this.ordersRepository.save(orderCreate);

    for (let i = 0; i < createOrderItemDTO.length; i++) {
      const itemData = {
        product_name: createOrderItemDTO[i].product_name,
        quantity: createOrderItemDTO[i].quantity,
        price: createOrderItemDTO[i].price,
        order: newOrderData,
        product: createOrderItemDTO[i].product,
      };

      const findProduct = await this.productsRepository.findOneBy({
        id: createOrderItemDTO[i].product.id,
      });

      if (!findProduct) {
        throw new NotFoundException('Produto não encontrado');
      }

      await this.productsService.StockCheck(
        createOrderItemDTO[i].product.id,
        createOrderItemDTO[i].quantity,
        newOrderData.id,
      );

      const quantityUpdate =
        findProduct.quantity - createOrderItemDTO[i].quantity;

      const productQuantityUpdate = await this.productsRepository.update(
        createOrderItemDTO[i].product.id,
        {
          quantity: quantityUpdate,
        },
      );

      if (!productQuantityUpdate || productQuantityUpdate.affected < 1) {
        throw new InternalServerErrorException(
          `Erro ao atualizar quantidade do produto ${createOrderItemDTO[i].product_name}`,
        );
      }

      const orderItemCreate = this.orderItemsRepository.create(itemData);

      await this.orderItemsRepository.save(orderItemCreate);
    }

    const findOrder = await this.FindById(newOrderData.id);

    const createPreferenceObject = this.ReturnItemsMPObject(findOrder.items);

    return {
      items: createPreferenceObject,
      payer: {
        email: findUser.email,
        name: findUser.name,
      },
    };
  }

  ReturnItemsMPObject(items: Items[]) {
    const itemsList = [];
    for (let i = 0; i < items.length; i++) {
      itemsList.push({
        id: items[i].product.id,
        title: items[i].product_name,
        quantity: items[i].quantity,
        currency_id: 'BRL',
        unit_price: items[i].price,
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

    if (expiredOrders.length === 0) {
      this.logger.log('✅ Nenhuma reserva expirada');
      return;
    }

    this.logger.log(`📋 Processando ${expiredOrders.length} pedidos expirados`);

    for (const order of expiredOrders) {
      try {
        // Liberar estoque
        order.items.forEach(async (item) => {
          const findProduct = await this.productsRepository.findOneBy({
            id: item.product.id,
          });

          if (!findProduct) {
            throw new NotFoundException(
              `Produto ${item.product_name} não encontrado para ser devolvido ao estoque`,
            );
          }

          const updatedProductQuantity = (findProduct.quantity +=
            item.quantity);

          const updateProductQuantity = await this.productsRepository.update(
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
        });

        // Cancelar pedido
        await this.ordersRepository.update(order.id, {
          status: OrderStatus.CANCELED,
          cancelReason: 'Expirado (30 minutos sem pagamento)',
          canceledAt: Date.now(),
        });

        this.logger.log(`✅ Pedido ${order.id} expirado e liberado`);
      } catch (error) {
        this.logger.error(
          `❌ Erro ao processar pedido ${order.id} do cliente ${order.user}`,
          error,
        );
      }
    }
  }

  async FindById(id: string) {
    const orderFindById = await this.ordersRepository.findOneBy({
      id,
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
