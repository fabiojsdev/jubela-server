import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDTO } from './create-order.dto';

export class UpdateOrderDTO extends PartialType(CreateOrderDTO) {}
