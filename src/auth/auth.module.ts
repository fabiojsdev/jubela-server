import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from 'src/email/email.module';
import { Employee } from 'src/employees/entities/employee.entity';
import { JWTBlacklistModule } from 'src/jwt-blacklist/jwt-blacklist.module';
import { LogsModule } from 'src/logs-register/log.module';
import { RefreshTokensModule } from 'src/refresh-tokens/refresh-token.module';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/user.module';
import { JWTBlacklist } from '../jwt-blacklist/entities/jwt_blacklist.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import googleOauthConfig from './config/google-oauth.config';
import jwtConfig from './config/jwt.config';
import { GoogleStrategy } from './google.strategy';
import { BcryptService } from './hashing/bcrypt.service';
import { HashingServiceProtocol } from './hashing/hashing.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, User, JWTBlacklist]),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(googleOauthConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    RefreshTokensModule,
    JWTBlacklistModule,
    UsersModule,
    LogsModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService,
    },
  ],
  exports: [HashingServiceProtocol, JwtModule, ConfigModule, AuthService],
})
export class AuthModule {}
