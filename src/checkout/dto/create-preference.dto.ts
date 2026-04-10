import { OrderDTO } from './order.dto';

export class CreateCheckoutDto {
  handle: string; // sua InfiniteTag (sem o $)
  items: OrderDTO[];
  redirect_url: string;
  order_nsu?: string; // ID do pedido no seu sistema
  webhook_url?: string;
  customer?: {
    name?: string;
    email?: string;
  };
}
