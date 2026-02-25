import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
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
  ) {}

  async Create(createUserDTO: CreateUserDTO) {
    const userCreate = this.usersRepository.create(createUserDTO);

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

  async Update(
    userIdDTO: UrlUuidDTO,
    updateUserDTO: UpdateUserDTO,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const id = userIdDTO.id;

    const allowedData = {
      email: updateUserDTO.email,
      name: updateUserDTO.name,
    };

    if (id !== tokenPayloadDTO.sub) {
      throw new ForbiddenException('Ação não permitida');
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
