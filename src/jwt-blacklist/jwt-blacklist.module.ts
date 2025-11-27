import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JWTBlacklist } from './entities/jwt_blacklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JWTBlacklist])],
  exports: [TypeOrmModule],
})
export class JWTBlacklistModule {}
