import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
import { Like, Repository } from 'typeorm';
import { CreateEmployeeDTO } from './dto/create-employee.dto';
import { PaginationByRoleDTO } from './dto/pagination-employee-role.dto';
import { PaginationDTO } from './dto/pagination-employee.dto';
import { UpdateEmployeeAdminDTO } from './dto/update-employee-admin.dto';
import { UpdateEmployeeDTO } from './dto/update-employee.dto';
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
      password_hash,
      role: createEmployeeDTO.role,
      situation: createEmployeeDTO.situation,
      phone_number: createEmployeeDTO.phone_number,
      address: createEmployeeDTO.address,
    };

    const employeeCreate = this.employeeRepository.create(employeeCreateData);

    const newEmployee = await this.employeeRepository.save(employeeCreate);

    const allowedData = {
      id: newEmployee.id,
      email: newEmployee.email,
      name: newEmployee.name,
      role: newEmployee.role,
    };

    return {
      ...allowedData,
    };
  }

  // Verificar se é um funcionário ou admin no guard ou middleware
  async UpdateSelf(id: string, updateEmployeeDTO: UpdateEmployeeDTO) {
    const allowedData = {
      email: updateEmployeeDTO.email,
      name: updateEmployeeDTO.name,
      password_hash: updateEmployeeDTO.password,
      phone_number: updateEmployeeDTO.phone_number,
      address: updateEmployeeDTO.address,
    };

    // if (id !== tokenPayload.sub) {
    //   throw new ForbiddenException('Ação não permitida');
    // }

    if (updateEmployeeDTO?.password) {
      const passwordHash = await this.hashingService.Hash(
        updateEmployeeDTO.password,
      );

      allowedData.password_hash = passwordHash;
    }

    const findEmployeeById = await this.employeeRepository.findOne({
      where: {
        id,
      },
    });

    if (!findEmployeeById) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const employeeUpdate = await this.employeeRepository.preload({
      id,
      ...allowedData,
    });

    if (!employeeUpdate) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar funcionário',
      );
    }

    return this.employeeRepository.save(employeeUpdate);
  }

  async UpdateAdmin(
    id: string,
    updateEmployeeAdminDTO: UpdateEmployeeAdminDTO,
  ) {
    const allowedData = {
      email: updateEmployeeAdminDTO.email,
      name: updateEmployeeAdminDTO.name,
      password_hash: updateEmployeeAdminDTO.password,
      role: updateEmployeeAdminDTO.role,
      situation: updateEmployeeAdminDTO.situation,
      phone_number: updateEmployeeAdminDTO.phone_number,
      address: updateEmployeeAdminDTO.address,
    };

    const findEmployeeById = await this.employeeRepository.findOne({
      where: {
        id,
      },
    });

    if (!findEmployeeById) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const employeeUpdate = await this.employeeRepository.preload({
      id,
      ...allowedData,
    });

    if (!employeeUpdate) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar dados de funcionário',
      );
    }

    return this.employeeRepository.save(employeeUpdate);
  }

  async FindByEmail(email: string) {
    const employeeFindByEmail = await this.employeeRepository.findOneBy({
      email,
      situation: 'empregado',
    });

    if (!employeeFindByEmail) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    return employeeFindByEmail;
  }

  async FindByName(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const employeeFindByName = await this.employeeRepository.find({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        name: Like(`${value}%`),
        situation: 'empregado',
      },
    });

    if (!employeeFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por funcionários',
      );
    }

    if (employeeFindByName.length < 1) {
      throw new NotFoundException('Funcionários não encontrados');
    }

    return employeeFindByName;
  }

  async FindByPhoneNumber(phoneNumber: string) {
    const employeeFindByPhoneNumber = await this.employeeRepository.findOneBy({
      phone_number: phoneNumber,
      situation: 'empregado',
    });

    if (!employeeFindByPhoneNumber) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    return employeeFindByPhoneNumber;
  }

  async FindByRole(paginationByRoleDTO: PaginationByRoleDTO) {
    const { limit, offset, value } = paginationByRoleDTO;

    const employeeFindByRole = await this.employeeRepository.find({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        role: value,
        situation: 'empregado',
      },
    });

    if (!employeeFindByRole) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por funcionários',
      );
    }

    if (employeeFindByRole.length < 1) {
      throw new NotFoundException('Funcionários não encontrados');
    }

    return employeeFindByRole;
  }
}
