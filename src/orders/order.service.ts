import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDTO } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async Create(createOrderDTO: CreateOrderDTO) {
    const productCreate = this.ordersRepository.create(createOrderDTO);

    const newProductData = await this.ordersRepository.save(productCreate);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...convenientData } = newProductData;

    return {
      ...convenientData,
    };
  }
}
