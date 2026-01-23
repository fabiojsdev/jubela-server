import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  return {
    sendgridApiKey: process.env.SENDGRID,
    from: process.env.FROM_EMAIL,
  };
});
