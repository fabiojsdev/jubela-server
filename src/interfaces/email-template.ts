import { OrderStatus } from 'src/common/enums/order-status.enum';

export interface EmailTemplateData {
  customerName: string;
  orderId: string;
  orderTotal: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  status: OrderStatus;
  statusMessage: string;
  actionMessage?: string;
  actionUrl?: string;
  additionalInfo?: string;
  refundAmount?: string;
  refundedItems?: Array<{
    name: string;
    quantity: number;
    amount: string;
  }>;
}
