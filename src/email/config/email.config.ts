import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  return {
    from: process.env.FROM_EMAIL,
    password: process.env.PASS,
    host: process.env.HOST,
    port: process.env.PORT_EMAIL,
  };
});
