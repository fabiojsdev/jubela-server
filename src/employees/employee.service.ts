import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
import { Repository } from 'typeorm';
import { CreateEmployeeDTO } from './dto/create-employee.dto';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async Create(createEmployeeDTO: CreateEmployeeDTO) {
    const password_hash = await this.hashingService.Hash(
      createEmployeeDTO.password,
    );

    const employeeCreateData = {
      cpf: createEmployeeDTO.cpf,
      email: createEmployeeDTO.email,
      name: createEmployeeDTO.name,
      password: password_hash,
      role: createEmployeeDTO.role,
      situation: createEmployeeDTO.situation,
      phone_number: createEmployeeDTO.phone_number,
      address: createEmployeeDTO.address,
    };

    const employeeCreate = this.employeeRepository.create(employeeCreateData);

    const newEmployee = this.employeeRepository.save(employeeCreate);

    // Tirar o return na hora de finalizar o projeto

    return {
      ...newEmployee,
    };
  }
}
