import { Logger, Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { OrdersModule } from 'src/orders/order.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CronJobOrgService } from './cron-job-org.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, CronJobOrgService, Logger],
  imports: [OrdersModule, EmailModule],
})
export class CheckoutModule {}
