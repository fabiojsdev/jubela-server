import { registerAs } from '@nestjs/config';

export default registerAs('mercadoPago', () => {
  return {
    accessToken: process.env.MP_ACCESS_TOKEN,
    publicKey: process.env.MP_PUBLIC_KEY,
    webhookSecret: process.env.MP_WEBHOOK_SECRET,
    appUrlBackend: process.env.APP_URL_BACKEND,
  };
});
