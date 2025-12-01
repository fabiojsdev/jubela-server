import { registerAs } from '@nestjs/config';

export default registerAs('googleOauth', () => {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET_KEY,
    callbackUrl: process.env.CALLBACK_URL,
  };
});
