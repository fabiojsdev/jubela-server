import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { EmailService } from './email.service';

@Controller('emails')
export class EmailControllerTemp {
  constructor(private readonly emailsService: EmailService) {}

  @Public()
  @Post()
  async SendEmail(@Body() body: any) {
    const send = await this.emailsService.SendOrderStatusEmail(
      body.order,
      body.orderStatus,
      body.forEnterprise,
      body.additionalData,
    );

    console.log(send);

    return send;
  }
}
