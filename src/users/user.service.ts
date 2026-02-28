import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
import { UrlUuidDTO } from 'src/common/dto/url-uuid.dto';
import { Like, Repository } from 'typeorm';
import { PaginationByNameDTO } from '../common/dto/pagination-name.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { SearchByEmailDTO } from './dto/search-email-user.dto';
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
    let password_hash: string | null = null;

    if (createUserDTO?.password) {
      password_hash = await this.hashingService.Hash(createUserDTO.password);
    }

    const userData = {
      name: createUserDTO.name,
      email: createUserDTO.email,
      password_hash,
    };

    const userCreate = this.usersRepository.create(userData);

    const newUser = await this.usersRepository.save(userCreate);

    if (!newUser) {
      throw new InternalServerErrorException('Erro ao criar conta');
    }

    return {
      ...newUser,
    };
  }

  async Update(
    userIdDTO: UrlUuidDTO,
    updateUserDTO: UpdateUserDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const id = userIdDTO.id;

    const allowedData = {
      email: updateUserDTO.email,
      name: updateUserDTO.name,
      password_hash: updateUserDTO.password,
    };

    if (id !== tokenPayloadDTO.sub) {
      throw new ForbiddenException('Ação não permitida');
    }

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

    const updatedUser = await this.usersRepository.save(userUpdate);

    if (!userUpdate || !updatedUser) {
      throw new InternalServerErrorException('Erro ao tentar atualizar dados');
    }

    return updatedUser;
  }

  async FindByEmail(emailDTO: SearchByEmailDTO) {
    const email = emailDTO.email;

    const userFindByEmail = await this.usersRepository.findOneBy({
      email,
    });

    if (!userFindByEmail) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return userFindByEmail;
  }

  async FindById(id: string) {
    const userFindById = await this.usersRepository.findOneBy({
      id,
    });

    if (!userFindById) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return userFindById;
  }

  async FindByIdMe(tokenPayloadDTO: TokenPayloadDTO) {
    const userFindById = await this.usersRepository.findOneBy({
      id: tokenPayloadDTO.sub,
    });

    if (!userFindById) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return userFindById;
  }

  async FindByEmailForGoogle(email: string) {
    const employeeFindByEmail = await this.usersRepository.findOneBy({
      email,
    });

    return employeeFindByEmail;
  }

  async FindByName(paginationByNameDTO: PaginationByNameDTO) {
    const { limit, offset, value } = paginationByNameDTO;

    const [userFindByName, total] = await this.usersRepository.findAndCount({
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

    return [total, ...userFindByName];
  }
}
