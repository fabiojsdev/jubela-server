import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as ejs from 'ejs';
import { join } from 'path';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { EmailTemplateData } from 'src/interfaces/email-template';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product.entity';
import emailConfig from './config/email.config';
import { RTAlertDTO } from './dto/rt-alert.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(emailConfig.KEY)
    private readonly emailConfiguration: ConfigType<typeof emailConfig>,
  ) {
    sgMail.setApiKey(emailConfiguration.sendgridApiKey);
  }

  async SendRTAlertEmployees(alertData: RTAlertDTO, forSupportTeam: boolean) {
    try {
      // Renderizar template
      const html = await this.RenderTemplate(
        'refresh-token-alert-employees',
        alertData,
      );

      // Enviar email
      const info: sgMail.MailDataRequired = {
        from: process.env.FROM_EMAIL,
        to: forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email,
        subject: 'Alerta de segurança',
        html,
      };

      await sgMail.send(info);

      this.logger.log(
        `Email enviado para ${forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email}`,
      );

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email}:`,
        error,
      );
      throw error;
    }
  }

  async SendRTAlertUsers(alertData: RTAlertDTO, forSupportTeam: boolean) {
    try {
      // Renderizar template
      const html = await this.RenderTemplate('user-session-alert', alertData);

      // Enviar email
      const info: sgMail.MailDataRequired = {
        from: process.env.FROM_EMAIL,
        to: forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email,
        subject: 'Alerta de segurança',
        html,
      };

      await sgMail.send(info);

      this.logger.log(
        `Email enviado para ${forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email}`,
      );

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${forSupportTeam === true ? process.env.FROM_EMAIL : alertData.email}:`,
        error,
      );
      throw error;
    }
  }

  async LogIssue(userOrEmployeeLog: string) {
    try {
      const info = {
        from: process.env.FROM_EMAIL,
        to: process.env.FROM_EMAIL,
        subject: `Erro ao criar logs de ${userOrEmployeeLog}`,
        html: '<h1>Erro na cração de logs do usuário</h1>',
      };

      await sgMail.send(info);

      this.logger.log(`Email enviado para ${process.env.FROM_EMAIL}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${process.env.FROM_EMAIL}`,
        error,
      );
      throw error;
    }
  }

  async ResetPassword(userEmail: string, tokenHash: string) {
    try {
      const resetPasswordLink = `https://jubela-client.vercel.app/reset-senha/?token=${tokenHash}`;

      const html = await this.RenderTemplate('password-reset', {
        resetPasswordLink,
      });

      // Enviar email
      const info: sgMail.MailDataRequired = {
        from: process.env.FROM_EMAIL,
        to: userEmail,
        subject: 'Redefinição de senha',
        html,
      };

      await sgMail.send(info);

      this.logger.log(`Email enviado para ${userEmail}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${userEmail}`, error);
    } finally {
      return {
        success: true,
      };
    }
  }

  async LowStockWarn(product: Product) {
    try {
      const productData = {
        productRanOut: product.quantity < 1 ? true : false,
        productName: product.name,
        sku: product.sku,
        stock: product.quantity,
      };

      const html = await this.RenderTemplate('stock-alert', productData);

      const info: sgMail.MailDataRequired = {
        from: process.env.FROM_EMAIL,
        to: process.env.FROM_EMAIL,
        subject: 'Produto com baixo estoque ou esgotado',
        html,
      };

      await sgMail.send(info);

      this.logger.log(`Email enviado para ${process.env.FROM_EMAIL}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${process.env.FROM_EMAIL}:`,
        error,
      );
      throw error;
    }
  }

  async SendOrderStatusEmail(
    order: Order,
    status: OrderStatus,
    forEnterprise: boolean,
    additionalData?: any,
  ) {
    // const findOrder = await this.ordersRepository.findOne({
    //   where: {
    //     id: order,
    //   },
    //   relations: {
    //     items: true,
    //     user: true,
    //   },
    // });

    console.log(status);
    console.log(order.status);

    if (status !== order.status) {
      throw new BadRequestException(
        `Status enviado diferente do status do pedido ${order}`,
      );
    }

    try {
      // Preparar dados baseados no status
      const emailData = this.PrepareEmailData(
        order,
        status,
        forEnterprise,
        additionalData,
      );

      // Renderizar template
      const html = await this.RenderTemplate('order-status', emailData);

      // Enviar email
      const info: sgMail.MailDataRequired = {
        from: process.env.FROM_EMAIL,
        to: forEnterprise === true ? process.env.FROM_EMAIL : order.user.email,
        subject: emailData.subject,
        html,
      };

      await sgMail.send(info);

      this.logger.log(
        `Email enviado para ${forEnterprise === true ? process.env.FROM_EMAIL : order.user}`,
      );

      return {
        success: true,
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
    forEnterprise: boolean,
    additionalData?: any,
  ): EmailTemplateData & { subject: string } {
    const baseData: EmailTemplateData = {
      customerName: order.user.name,
      orderId: order.id,
      orderTotal: this.FormatCurrency(Number(order.total_price)),
      orderItems: order.items?.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: this.FormatCurrency(Number(item.price)),
      })),
      status,
      statusMessage: '',
      forEnterprise,
      actionMessage: '',
      // explicar
      actionUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      additionalInfo: '',
      refundAmount: additionalData.refundAmount,
      refundedItems: additionalData.refundedItems,
    };

    // Configurações específicas por status
    switch (status) {
      case OrderStatus.APPROVED:
        return {
          ...baseData,
          subject: `✅ Pagamento Confirmado - Pedido #${order.id}`,
          statusMessage:
            forEnterprise === true
              ? `Pagamento feito pelo cliente ${order.user.email} aprovado`
              : 'Seu pagamento foi aprovado com sucesso!',
          actionMessage:
            forEnterprise === true
              ? ''
              : 'Seu pedido está sendo preparado para envio.',
          // additionalInfo:
          //   'Você receberá um email com o código de rastreamento em breve.',
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

      // case OrderStatus.WAITING_PAYMENT:
      //   return {
      //     ...baseData,
      //     subject: `⏳ Aguardando Pagamento - Pedido #${order.id}`,
      //     statusMessage: 'Estamos aguardando a confirmação do seu pagamento.',
      //     actionMessage: 'Complete o pagamento para prosseguir.',
      //     additionalInfo: 'O pedido expira em 30 minutos se não for pago.',
      //   };

      // case OrderStatus.IN_PROCESS:
      //   return {
      //     ...baseData,
      //     subject: `🔄 Pagamento em Análise - Pedido #${order.id}`,
      //     statusMessage: 'Seu pagamento está sendo analisado.',
      //     actionMessage: 'Isso pode levar alguns minutos.',
      //     additionalInfo: 'Você receberá um email assim que for aprovado.',
      //   };

      // case OrderStatus.CANCELED:
      //   return {
      //     ...baseData,
      //     subject: `🚫 Pedido Cancelado - #${order.id}`,
      //     statusMessage: 'Seu pedido foi cancelado.',
      //     actionMessage: 'Nenhuma cobrança foi realizada.',
      //     additionalInfo:
      //       additionalData?.reason ||
      //       'Se precisar de ajuda, entre em contato conosco.',
      //   };

      case OrderStatus.REFUNDED:
        return {
          ...baseData,
          subject: `💰 Estorno Processado - Pedido #${order.id}`,
          statusMessage:
            forEnterprise === true
              ? `Estorno do cliente ${order.user.email} processado.`
              : 'O estorno do seu pedido foi processado com sucesso.',
          actionMessage: 'O valor será creditado em 5-10 dias úteis.',
          additionalInfo: `Valor estornado: ${this.FormatCurrency(Number(order.refundAmount))}`,
        };

      case OrderStatus.PARTIAL_REFUND:
        return {
          ...baseData,
          subject: `💰 Estorno Parcial Processado - Pedido #${order.id}`,
          statusMessage:
            forEnterprise === true
              ? `Estorno parcial do cliente ${order.user.email} processado com sucesso`
              : 'Um estorno parcial foi processado para o seu pedido.',
          actionMessage: 'O valor será creditado em 5-10 dias úteis.',
          refundAmount: this.FormatCurrency(
            Number(additionalData?.refundAmount),
          ),
          refundedItems: additionalData?.refundedItems?.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            amount: this.FormatCurrency(Number(item.amount)),
          })),
          additionalInfo: `Valor estornado: ${this.FormatCurrency(Number(additionalData?.refundAmount))}`,
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

  async SendPaymentApprovedEmail(order: Order, forEnterprise: boolean) {
    return this.SendOrderStatusEmail(
      order,
      OrderStatus.APPROVED,
      forEnterprise,
    );
  }

  async SendPaymentRejectedEmail(
    order: Order,
    forEnterprise: boolean,
    reason?: string,
  ) {
    return this.SendOrderStatusEmail(
      order,
      OrderStatus.REJECTED,
      forEnterprise,
      { reason },
    );
  }

  // async SendPaymentPendingEmail(order: Order, forEnterprise: boolean) {
  //   return this.SendOrderStatusEmail(
  //     order,
  //     OrderStatus.WAITING_PAYMENT,
  //     forEnterprise,
  //   );
  // }

  // async SendPaymentInProcessEmail(order: Order, forEnterprise: boolean) {
  //   return this.SendOrderStatusEmail(
  //     order,
  //     OrderStatus.IN_PROCESS,
  //     forEnterprise,
  //   );
  // }

  // async SendOrderCanceledEmail(
  //   order: Order,
  //   forEnterprise: boolean,
  //   reason?: string,
  // ) {
  //   return this.SendOrderStatusEmail(
  //     order,
  //     OrderStatus.CANCELED,
  //     forEnterprise,
  //     { reason },
  //   );
  // }

  async SendRefundProcessedEmail(order: Order, forEnterprise: boolean) {
    return this.SendOrderStatusEmail(
      order,
      OrderStatus.REFUNDED,
      forEnterprise,
    );
  }

  async SendPartialRefundEmail(
    order: Order,
    refundAmount: number,
    forEnterprise: boolean,
    refundedItems: Array<{
      productName: string;
      quantity: number;
      amount: number;
    }>,
  ) {
    return this.SendOrderStatusEmail(
      order,
      OrderStatus.PARTIAL_REFUND,
      forEnterprise,
      {
        refundAmount,
        refundedItems,
      },
    );
  }

  private async RenderTemplate(templateFile: string, data: any) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'templates',
        `${templateFile}.ejs`,
      );

      const html = (await ejs.renderFile(templatePath, data)) as string;
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
