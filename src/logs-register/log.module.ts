import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEmployee } from './entities/log-employee.entity';
import { LogUser } from './entities/log-user.entity';
import { LogsService } from './log.service';

@Module({
  imports: [TypeOrmModule.forFeature([LogEmployee, LogUser])],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
