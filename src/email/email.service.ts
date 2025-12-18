import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

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
  }

  async SendEmail(
    to: string,
    subject: string,
    content?: string,
    variables?: any,
  ) {
    // Usar no template
    console.log(variables);
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text: content,
    };

    const send = await this.transporter.sendMail(mailOptions);
    console.log(send);
  }
}
