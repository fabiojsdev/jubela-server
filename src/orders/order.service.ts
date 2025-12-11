import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { UsersService } from 'src/users/user.service';
import { Repository } from 'typeorm';
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

    @InjectRepository(Items)
    private readonly orderItemsRepository: Repository<Items>,
    private readonly usersService: UsersService,
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
      status: OrderStatus.WAITING_PAYMENT,
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

  async FindById(id: string) {
    const orderFindById = await this.ordersRepository.findOneBy({
      id,
    });

    if (!orderFindById) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return orderFindById;
  }

  async ListOrders(paginationAllOrders?: PaginationAllOrdersDTO) {
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

  async FindByPrice(paginationByPriceDTO: PaginationByPriceDTO) {
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

  async FindByItem(paginationDTO: PaginationDTO) {
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
