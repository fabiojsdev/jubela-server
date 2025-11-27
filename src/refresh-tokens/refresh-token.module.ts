import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from 'src/employees/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { RefreshTokenEmployee } from './entities/refresh-token-employee.entity';
import { RefreshTokenUser } from './entities/refresh-token-user.entity';
import { RefreshTokensController } from './refresh-token.controller';
import { RefreshTokensService } from './refresh-token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshTokenEmployee,
      RefreshTokenUser,
      Employee,
      User,
    ]),
  ],
  controllers: [RefreshTokensController],
  providers: [RefreshTokensService],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
