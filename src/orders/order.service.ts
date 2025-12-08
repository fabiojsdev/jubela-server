import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderItemDTO } from './dto/create-item.dto';
import { CreateOrderDTO } from './dto/create-order.dto';
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
  ) {}

  async Create(
    createOrderDTO: CreateOrderDTO,
    createOrderItemDTO: CreateOrderItemDTO[],
  ) {
    const decimal = new Decimal(0);

    for (let i = 0; i < createOrderItemDTO.length; i++) {
      decimal.add(createOrderItemDTO[i].price);
    }

    const orderData = {
      total_price: Number(decimal),
      desciption: createOrderDTO.description,
      user: '',
      items: [],
      status: OrderStatus.WAITING_PAYMENT,
    };

    const orderCreate = this.ordersRepository.create(createOrderDTO);

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

    // return this.ReturnItemsMPObject()
  }

  ReturnItemsMPObject(items: Items[], user: User) {
    const itemsList = [];
    for (let i = 0; i < items.length; i++) {
      itemsList.push(
        {
          id: items[i].product,
          title: items[i].product_name,
          quantity: items[i].quantity,
          currency_id: 'BRL',
          unit_price: items[i].price,
        },
        {
          email: user.email,
          name: user.name,
        },
      );
    }

    return itemsList;
  }

  async ListOrders(paginationAllOrders?: PaginationAllOrdersDTO) {
    const { limit, offset } = paginationAllOrders;

    const findAll = await this.ordersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
    });

    return findAll;
  }

  async FindByPrice(paginationByPriceDTO: PaginationByPriceDTO) {
    const { limit, offset, value } = paginationByPriceDTO;

    const orderFindByName = await this.ordersRepository.find({
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

    return orderFindByName;
  }

  async FindByItem(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const orderFindByName = await this.ordersRepository.find({
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

    return orderFindByName;
  }

  async FindByStatus(paginationByStatusDTO: PaginationByStatusDTO) {
    const { limit, offset, value } = paginationByStatusDTO;

    const orderFindByStatus = await this.ordersRepository.find({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        status: value,
      },
    });

    if (!orderFindByStatus) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por pedidos',
      );
    }

    if (orderFindByStatus.length < 1) {
      throw new NotFoundException('Pedidos não encontrados');
    }

    return orderFindByStatus;
  }

  async FindByUser(paginationByUserDTO: PaginationByUserDTO) {
    const { limit, offset, value } = paginationByUserDTO;

    const orderFindByUser = await this.ordersRepository.find({
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

    return orderFindByUser;
  }
}
