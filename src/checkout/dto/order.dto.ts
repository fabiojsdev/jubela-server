import { CreateOrderItemDTO } from 'src/orders/dto/create-item.dto';
import { CreateOrderDTO } from 'src/orders/dto/create-order.dto';
import { CreatePreferenceDto } from './create-preference.dto';

export class OrderDTO {
  order: CreateOrderDTO;
  orderItems: CreateOrderItemDTO[];
  preference: CreatePreferenceDto;
}
