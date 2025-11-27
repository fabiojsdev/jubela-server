import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from 'src/employees/entities/employee.entity';
import { JWTBlacklistModule } from 'src/jwt-blacklist/jwt-blacklist.module';
import { RefreshTokensModule } from 'src/refresh-tokens/refresh-token.module';
import { User } from 'src/users/entities/user.entity';
import { JWTBlacklist } from '../jwt-blacklist/entities/jwt_blacklist.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import jwtConfig from './config/jwt.config';
import { BcryptService } from './hashing/bcrypt.service';
import { HashingServiceProtocol } from './hashing/hashing.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, User, JWTBlacklist]),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    RefreshTokensModule,
    JWTBlacklistModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService,
    },
  ],
  exports: [HashingServiceProtocol, JwtModule, ConfigModule, AuthService],
})
export class AuthModule {}
