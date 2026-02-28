import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
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

  async Update(tokenPayloadDTO: TokenPayloadDTO, updateUserDTO: UpdateUserDTO) {
    const allowedData = {
      email: updateUserDTO.email,
      name: updateUserDTO.name,
      password_hash: '',
    };

    const { sub: id } = tokenPayloadDTO;

    if (!id) {
      throw new BadRequestException('Id não enviado');
    }

    const findUserById = await this.usersRepository.findOne({
      where: {
        id,
      },
    });

    if (!findUserById) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateUserDTO.newPassword && !updateUserDTO.currentPassword) {
      throw new BadRequestException('Senha antiga não enviada');
    }

    const updateEmailOrPassword = await this.VerifyToUpdateEmailOrPassword(
      findUserById,
      updateUserDTO.email,
      updateUserDTO.currentPassword,
      updateUserDTO.newPassword,
    );

    if (updateEmailOrPassword.email) {
      allowedData.email = updateEmailOrPassword.email;
    }

    if (updateEmailOrPassword.password) {
      allowedData.password_hash = updateEmailOrPassword.password;
    }

    const userUpdate = await this.usersRepository.preload({
      id,
      ...allowedData,
    });

    const updatedUser = await this.usersRepository.save(userUpdate);

    if (!userUpdate || !updatedUser) {
      throw new InternalServerErrorException('Erro ao tentar atualizar dados');
    }

    const newUserData = await this.usersRepository.findOne({
      where: {
        id,
      },
    });

    return {
      success: true,
      name: newUserData.name,
      email: newUserData.email,
    };
  }

  private async VerifyToUpdateEmailOrPassword(
    user: User,
    newEmail?: string,
    currentPassword?: string,
    newPassword?: string,
  ) {
    const newData = {
      email: '',
      password: '',
    };

    if (newPassword) {
      const passwordCompare = await this.hashingService.Compare(
        currentPassword,
        user.password_hash,
      );

      if (!passwordCompare) {
        throw new UnauthorizedException('Senha incorreta');
      }

      const passwordHash = await this.hashingService.Hash(newPassword);

      newData.password = passwordHash;
    }

    if (newEmail) {
      const passwordCompare = await this.hashingService.Compare(
        currentPassword,
        user.password_hash,
      );

      if (!passwordCompare) {
        throw new UnauthorizedException('Senha incorreta');
      }

      newData.email = newEmail;
    }

    return newData;
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
