import { registerAs } from '@nestjs/config';

export default registerAs('mercadoPago', () => {
  return {
    accessToken: process.env.MP_ACCESS_TOKEN,
    publicKey: process.env.MP_PUBLIC_KEY,
    webhookKey: process.env.MP_WEBHOOK_KEY,
    appUrlBackend: process.env.APP_URL_BACKEND,
  };
});
