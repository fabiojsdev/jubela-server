import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import emailConfig from './config/email.config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly emailConfiguration: ConfigType<typeof emailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: emailConfiguration.host,
      port: parseInt(emailConfiguration.port, 10),
      secure: false, // true em prod
      auth: {
        user: emailConfiguration.from,
        pass: emailConfiguration.password,
      },
    });
  }

  async SendEmail(to: string, subject: string, content: string) {
    const mailOptions = {
      from: `Não responda <${this.emailConfiguration.from}>`,
      to,
      subject,
      text: content,
    };

    const send = await this.transporter.sendMail(mailOptions);
    console.log(send);
  }
}
