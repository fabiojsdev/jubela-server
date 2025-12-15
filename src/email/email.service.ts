import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: parseInt(process.env.PORT_EMAIL, 10),
      secure: false, // true em prod
      auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.PASSSWORD,
      },
    });
  }

  async SendEmail(to: string, subject: string, content: string) {
    const mailOptions = {
      from: `Não responda <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text: content,
    };

    const send = await this.transporter.sendMail(mailOptions);
    console.log(send);
  }
}
