import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { AuthModule } from 'src/auth/auth.module';
import { AuthTokenGuard } from 'src/auth/guards/auth-token.guard';
import { EmployeesModule } from 'src/employees/employee.module';
import { JWTBlacklistModule } from 'src/jwt-blacklist/jwt-blacklist.module';
import { LogsModule } from 'src/logs-register/log.module';
import { OrdersModule } from 'src/orders/order.module';
import { ProductsModule } from 'src/products/product.module';
import { RefreshTokensModule } from 'src/refresh-tokens/refresh-token.module';
import { UsersModule } from 'src/users/user.module';
import appConfig from './app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigModule.forFeature(appConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(appConfig)],
      inject: [appConfig.KEY],
      useFactory: async (appConfigParam: ConfigType<typeof appConfig>) => {
        return {
          type: 'postgres',
          host: appConfigParam.host,
          port: appConfigParam.port,
          username: appConfigParam.username,
          database: appConfigParam.database,
          password: appConfigParam.password,
          autoLoadEntities: appConfigParam.autoLoadEntities,
          synchronize: appConfigParam.synchronize,
        };
      },
    }),
    EmployeesModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    RefreshTokensModule,
    JWTBlacklistModule,
    LogsModule,
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '..', '..', 'images'),
      serveRoot: '/images',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthTokenGuard,
    },
  ],
})
export class AppModule {}
