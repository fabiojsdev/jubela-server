import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthTokenGuard } from 'src/auth/guards/auth-token.guard';
import { EmployeesModule } from 'src/employees/employee.module';
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
          type: appConfigParam.database.type,
          host: appConfigParam.database.host,
          port: appConfigParam.database.port,
          username: appConfigParam.database.username,
          database: appConfigParam.database.database,
          password: appConfigParam.database.password,
          autoLoadEntities: appConfigParam.database.autoLoadEntities,
          synchronize: appConfigParam.database.synchronize,
        };
      },
    }),
    EmployeesModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    RefreshTokensModule,
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
