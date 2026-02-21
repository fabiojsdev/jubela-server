import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { CreateLogEmployee } from './dto/create-log-employee.dto';
import { CreateLogUser } from './dto/create-log-user.dto';
import { LogEmployee } from './entities/log-employee.entity';
import { LogUser } from './entities/log-user.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogUser)
    private readonly logUserRepository: Repository<LogUser>,
  ) {}

  async CreateLogEmployee(
    createLogEmployeeDTO: CreateLogEmployee,
    queryRunnerSub: QueryRunner,
  ) {
    const createLog = queryRunnerSub.manager.create(
      LogEmployee,
      createLogEmployeeDTO,
    );

    await queryRunnerSub.manager.save(LogEmployee, createLog);

    return 'Log criado com sucesso';
  }

  async CreateLogUser(createLogUserDTO: CreateLogUser) {
    const createLog = this.logUserRepository.create(createLogUserDTO);

    const newLog = await this.logUserRepository.save(createLog);

    if (!newLog) {
      throw new InternalServerErrorException('Erro ao criar log');
    }

    return 'Log criado com sucesso';
  }
}
