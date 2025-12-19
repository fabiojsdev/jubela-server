import { Injectable, Logger } from '@nestjs/common';
import ejs from 'ejs';
import * as nodemailer from 'nodemailer';
import { join } from 'path';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { EmailTemplateData } from 'src/interfaces/email-template';
import { Order } from 'src/orders/entities/order.entity';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: parseInt(process.env.PORT_EMAIL, 10),
      secure: true, // true em prod
      auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.PASS,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Erro ao conectar ao servidor SMTP:', error.message);
      } else {
        this.logger.log('Servidor SMTP pronto para enviar emails');
      }
    });
  }

  async SendOrderStatusEmail(
    order: Order,
    status: OrderStatus,
    additionalData?: any,
  ) {
    try {
      // Preparar dados baseados no status
      const emailData = this.PrepareEmailData(order, status, additionalData);

      // Renderizar template
      const html = await this.RenderTemplate(emailData);

      // Enviar email
      const info = await this.transporter.sendMail({
        from: `"Não responda" <${process.env.FROM_EMAIL}>`,
        to: order.user.email,
        subject: emailData.subject,
        html,
      });

      this.logger.log(
        `Email enviado: ${info.messageId} para ${order.user.email}`,
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${order.user.email}:`,
        error,
      );
      throw error;
    }
  }

  private PrepareEmailData(
    order: Order,
    status: OrderStatus,
    additionalData?: any,
  ): EmailTemplateData & { subject: string } {
    const baseData: EmailTemplateData = {
      customerName: order.user.name,
      orderId: order.id,
      // precisa ser Decimal?
      orderTotal: this.FormatCurrency(Number(order.total_price)),
      orderItems: order.items?.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        // precisa ser Decimal?
        price: this.FormatCurrency(Number(item.price)),
      })),
      status,
      statusMessage: '',
      actionMessage: '',
      // explicar
      actionUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
    };

    // Configurações específicas por status
    switch (status) {
      case OrderStatus.APPROVED:
        return {
          ...baseData,
          subject: `✅ Pagamento Confirmado - Pedido #${order.id}`,
          statusMessage: 'Seu pagamento foi aprovado com sucesso!',
          actionMessage: 'Seu pedido está sendo preparado para envio.',
          additionalInfo:
            'Você receberá um email com o código de rastreamento em breve.',
        };

      case OrderStatus.REJECTED:
        return {
          ...baseData,
          subject: `⚠️ Pagamento Não Aprovado - Pedido #${order.id}`,
          statusMessage: 'Infelizmente seu pagamento não foi aprovado.',
          actionMessage: 'Tente novamente com outro método de pagamento.',
          additionalInfo:
            additionalData?.reason ||
            'Entre em contato com seu banco para mais informações.',
        };

      case OrderStatus.WAITING_PAYMENT:
        return {
          ...baseData,
          subject: `⏳ Aguardando Pagamento - Pedido #${order.id}`,
          statusMessage: 'Estamos aguardando a confirmação do seu pagamento.',
          actionMessage: 'Complete o pagamento para prosseguir.',
          additionalInfo: 'O pedido expira em 30 minutos se não for pago.',
        };

      case OrderStatus.IN_PROCESS:
        return {
          ...baseData,
          subject: `🔄 Pagamento em Análise - Pedido #${order.id}`,
          statusMessage: 'Seu pagamento está sendo analisado.',
          actionMessage: 'Isso pode levar alguns minutos.',
          additionalInfo: 'Você receberá um email assim que for aprovado.',
        };

      case OrderStatus.CANCELED:
        return {
          ...baseData,
          subject: `🚫 Pedido Cancelado - #${order.id}`,
          statusMessage: 'Seu pedido foi cancelado.',
          actionMessage: 'Nenhuma cobrança foi realizada.',
          additionalInfo:
            additionalData?.reason ||
            'Se precisar de ajuda, entre em contato conosco.',
        };

      case OrderStatus.REFUNDED:
        return {
          ...baseData,
          subject: `💰 Estorno Processado - Pedido #${order.id}`,
          statusMessage: 'O estorno do seu pedido foi processado com sucesso.',
          actionMessage: 'O valor será creditado em 5-10 dias úteis.',
          // precisa ser Decimal?
          additionalInfo: `Valor estornado: ${this.FormatCurrency(Number(order.refundAmount))}`,
        };

      case OrderStatus.PARTIAL_REFUND:
        return {
          ...baseData,
          subject: `💰 Estorno Parcial Processado - Pedido #${order.id}`,
          statusMessage: 'Um estorno parcial foi processado para o seu pedido.',
          actionMessage: 'O valor será creditado em 5-10 dias úteis.',
          refundAmount: this.FormatCurrency(additionalData?.refundAmount || 0),
          refundedItems: additionalData?.refundedItems?.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            amount: this.FormatCurrency(item.amount),
          })),
          additionalInfo: `Valor estornado: ${this.FormatCurrency(additionalData?.refundAmount || 0)}`,
        };

      default:
        return {
          ...baseData,
          subject: `Atualização do Pedido #${order.id}`,
          statusMessage: 'Seu pedido foi atualizado.',
          actionMessage: 'Acompanhe o status do seu pedido.',
        };
    }
  }

  async SendPaymentApprovedEmail(order: Order) {
    return this.SendOrderStatusEmail(order, OrderStatus.APPROVED);
  }

  async SendPaymentRejectedEmail(order: Order, reason?: string) {
    return this.SendOrderStatusEmail(order, OrderStatus.REJECTED, { reason });
  }

  async SendPaymentPendingEmail(order: Order) {
    return this.SendOrderStatusEmail(order, OrderStatus.WAITING_PAYMENT);
  }

  async SendPaymentInProcessEmail(order: Order) {
    return this.SendOrderStatusEmail(order, OrderStatus.IN_PROCESS);
  }

  async SendOrderCanceledEmail(order: Order, reason?: string) {
    return this.SendOrderStatusEmail(order, OrderStatus.CANCELED, { reason });
  }

  async SendRefundProcessedEmail(order: Order) {
    return this.SendOrderStatusEmail(order, OrderStatus.REFUNDED);
  }

  async SendPartialRefundEmail(
    order: Order,
    refundAmount: number,
    refundedItems: Array<{
      productName: string;
      quantity: number;
      amount: number;
    }>,
  ) {
    return this.SendOrderStatusEmail(order, OrderStatus.PARTIAL_REFUND, {
      refundAmount,
      refundedItems,
    });
  }

  private async RenderTemplate(data: any) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'checkout',
        'order-status.ejs',
      );

      const html = await ejs.renderFile(templatePath, data);
      return html;
    } catch (error) {
      this.logger.error(
        `Erro ao renderizar template orders-status.ejs:`,
        error.message,
      );
      throw error;
    }
  }

  private FormatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
