import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from 'src/email/email.module';
import { Employee } from 'src/employees/entities/employee.entity';
import { LogsModule } from 'src/logs-register/log.module';
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
    EmailModule,
    LogsModule,
  ],
  controllers: [RefreshTokensController],
  providers: [RefreshTokensService, Logger],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
