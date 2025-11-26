import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEmployee } from './entities/refresh-token-employee.entity';
import { RefreshTokenUser } from './entities/refresh-token-user.entity';
import { RefreshTokensController } from './refresh-token.controller';
import { RefreshTokensService } from './refresh-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshTokenEmployee, RefreshTokenUser])],
  controllers: [RefreshTokensController],
  providers: [RefreshTokensService],
})
export class RefreshTokensModule {}
