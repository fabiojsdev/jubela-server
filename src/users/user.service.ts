import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
import { Like, Repository } from 'typeorm';
import { CreateUserDTO } from './dto/create-user.dto';
import { PaginationDTO } from './dto/pagination-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async Create(createUserDTO: CreateUserDTO) {
    const password_hash = await this.hashingService.Hash(
      createUserDTO.password,
    );

    const userCreateData = {
      email: createUserDTO.email,
      name: createUserDTO.name,
      password_hash,
      phone_number: createUserDTO.phone_number,
      address: createUserDTO.address,
    };

    const userCreate = this.usersRepository.create(userCreateData);

    const newUser = await this.usersRepository.save(userCreate);

    const allowedData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };

    return {
      ...allowedData,
    };
  }

  async Update(id: string, updateUserDTO: UpdateUserDTO) {
    const allowedData = {
      email: updateUserDTO.email,
      name: updateUserDTO.name,
      password_hash: updateUserDTO.password,
      phone_number: updateUserDTO.phone_number,
      address: updateUserDTO.address,
    };

    // if (id !== tokenPayload.sub) {
    //   throw new ForbiddenException('Ação não permitida');
    // }

    if (updateUserDTO?.password) {
      const passwordHash = await this.hashingService.Hash(
        updateUserDTO.password,
      );

      allowedData.password_hash = passwordHash;
    }

    const findUserById = await this.usersRepository.findOne({
      where: {
        id,
      },
    });

    if (!findUserById) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const userUpdate = await this.usersRepository.preload({
      id,
      ...allowedData,
    });

    if (!userUpdate) {
      throw new InternalServerErrorException('Erro ao tentar atualizar dados');
    }

    return this.usersRepository.save(userUpdate);
  }

  async FindByEmail(email: string) {
    const employeeFindByEmail = await this.usersRepository.findOneBy({
      email,
    });

    if (!employeeFindByEmail) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return employeeFindByEmail;
  }

  async FindByName(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const userFindByName = await this.usersRepository.find({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {
        name: Like(`${value}%`),
      },
    });

    if (!userFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por usuários',
      );
    }

    if (userFindByName.length < 1) {
      throw new NotFoundException('Usuários não encontrados');
    }

    return userFindByName;
  }

  async FindByPhoneNumber(phoneNumber: string) {
    const userFindByPhoneNumber = await this.usersRepository.findOneBy({
      phone_number: phoneNumber,
    });

    if (!userFindByPhoneNumber) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return userFindByPhoneNumber;
  }
}
