import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: ['https://jubela-client.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 3600,
  });

  app.use(helmet());
  app.use(cookieParser());

  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf: Buffer) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
