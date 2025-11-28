import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import jwtConfig from 'src/auth/config/jwt.config';
import { HashingServiceProtocol } from 'src/auth/hashing/hashing.service';
import { EmployeeSituation } from 'src/common/enums/employee-situation.enum';
import { Employee } from 'src/employees/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { RefreshTokenEmployee } from './entities/refresh-token-employee.entity';
import { RefreshTokenUser } from './entities/refresh-token-user.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshTokenEmployee)
    private readonly RTEmployeeRepository: Repository<RefreshTokenEmployee>,

    @InjectRepository(RefreshTokenUser)
    private readonly RTUserRepository: Repository<RefreshTokenUser>,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async CreateEmployee(refreshToken: string, sub: Employee) {
    const hashedRefreshToken = await this.hashingService.Hash(refreshToken);

    const rtData = {
      refresh_token: hashedRefreshToken,
      is_valid: true,
      employee: sub,
    };

    const rtCreate = this.RTEmployeeRepository.create(rtData);

    const newRT = await this.RTEmployeeRepository.save(rtCreate);

    return {
      ...newRT,
    };
  }

  async CreateUser(refreshToken: string, sub: User) {
    await this.FindUsedRefreshTokenUser(refreshToken, sub);

    const hashedRefreshToken = await this.hashingService.Hash(refreshToken);

    const rtData = {
      refresh_token: hashedRefreshToken,
      is_valid: true,
      user: sub,
    };

    const rtCreate = this.RTUserRepository.create(rtData);

    await this.RTUserRepository.save(rtCreate);
  }

  async FindUsedRefreshTokenEmployee(sub: Employee) {
    const findUsedRefreshTokenAll = await this.RTEmployeeRepository.find({
      where: {
        employee: {
          id: sub.id,
        },
      },
    });

    const findUsedRefreshTokenOne = await this.RTEmployeeRepository.findOne({
      where: {
        employee: {
          id: sub.id,
        },
        is_valid: true,
      },
    });

    if (!findUsedRefreshTokenAll) {
      throw new InternalServerErrorException(
        'Erro ao buscar refresh tokens relacionados ao usuário',
      );
    }

    return {
      findUsedAll: findUsedRefreshTokenAll,
      findUsedOne: findUsedRefreshTokenOne,
    };
  }

  async RefreshTokenVerify(
    refreshTokenDataArray: RefreshTokenEmployee[] | RefreshTokenUser[],
    refreshTokenData: RefreshTokenEmployee | RefreshTokenUser,
    refreshToken: string,
    sub: Employee,
  ) {
    const rtExists = [];

    if (refreshTokenDataArray.length > 0) {
      for (let i = 0; i < refreshTokenDataArray.length; i++) {
        const compare = await this.hashingService.Compare(
          refreshToken,
          refreshTokenDataArray[i].refresh_token,
        );

        console.log({
          token: refreshToken,
          token_hash: refreshTokenDataArray[i].refresh_token,
          is_valid: refreshTokenDataArray[i].is_valid,
          result: compare,
        });

        if (compare === true) {
          rtExists.push(refreshTokenDataArray[i]);
          break;
        }
      }

      if (rtExists.length > 0) {
        console.log('EXISTS: ');
        console.log(rtExists);
        if (rtExists[0].is_valid !== true) {
          return this.RevokeAllEmployee(sub, false);
        }
      }

      const updateIsValid = await this.RTEmployeeRepository.update(
        refreshTokenData.id,
        {
          is_valid: false,
        },
      );

      if (!updateIsValid) {
        throw new InternalServerErrorException(
          'Erro ao atualizar estado de refresh token',
        );
      }

      return 'RT anterior invalidado com sucesso';
    }

    return 'Ok';
  }

  async FindUsedRefreshTokenUser(refreshToken: string, sub: User) {
    const rtExists = [];

    const findUsedRefreshToken = await this.RTUserRepository.find({
      where: {
        user: {
          id: sub.id,
        },
      },
    });

    const findUsedRefreshToken2 = await this.RTUserRepository.findOne({
      where: {
        user: {
          id: sub.id,
        },
        is_valid: true,
      },
    });

    if (findUsedRefreshToken.length > 0) {
      for (let i = 0; i < findUsedRefreshToken.length; i++) {
        const compare = await this.hashingService.Compare(
          refreshToken,
          findUsedRefreshToken[i].refresh_token,
        );

        if (compare === true) {
          rtExists.push(findUsedRefreshToken[i]);
          break;
        }
      }

      if (rtExists.length > 0) {
        if (rtExists[0].is_valid !== true) {
          await this.RevokeAllUser(sub, false);
        }
      }

      const updateIsValid = await this.RTUserRepository.update(
        findUsedRefreshToken2.id,
        {
          is_valid: false,
        },
      );

      if (!updateIsValid) {
        throw new InternalServerErrorException(
          'Erro ao atualizar estado de refresh token',
        );
      }

      return 'RT anterior invalidado com sucesso';
    }

    if (findUsedRefreshToken2) {
      const updateIsValid = await this.RTUserRepository.update(
        findUsedRefreshToken2.id,
        {
          is_valid: false,
        },
      );

      if (!updateIsValid) {
        throw new InternalServerErrorException(
          'Erro ao atualizar estado de refresh token',
        );
      }
    }

    return 'Ok';
  }

  async RevokeAllEmployee(sub: Employee, isLogout: boolean) {
    try {
      const findAllUserRT = await this.RTEmployeeRepository.find({
        where: {
          employee: {
            id: sub.id,
          },
        },
      });

      for (let i = 0; i < findAllUserRT.length; i++) {
        await this.RTEmployeeRepository.update(findAllUserRT[i].id, {
          is_valid: false,
        });
      }
      // Mandar um email de alerta também

      if (isLogout) return;

      throw new Error('Acessos revogados, contate o suporte');
    } catch (error) {
      throw new UnauthorizedException({
        message: error.message,
        where: 'RevokeAll',
      });
    }
  }

  async RevokeAllUser(sub: User, isLogout: boolean) {
    try {
      const findAllUserRT = await this.RTUserRepository.find({
        where: {
          user: {
            id: sub.id,
          },
        },
      });

      for (let i = 0; i < findAllUserRT.length; i++) {
        await this.RTEmployeeRepository.update(findAllUserRT[i].id, {
          is_valid: false,
        });
      }
      // Mandar um email de alerta também

      if (isLogout) return;

      throw new Error('Acessos revogados, contate o suporte');
    } catch (error) {
      throw new UnauthorizedException({
        message: error.message,
        where: 'RevokeAll',
      });
    }
  }

  async RefreshTokensEmployee(refreshTokenDto: RefreshTokenDTO) {
    const { sub } = await this.jwtService.verifyAsync(
      refreshTokenDto.refreshToken,
      this.jwtConfiguration,
    );

    const findEmployee = await this.employeeRepository.findOne({
      where: {
        id: sub,
        situation: EmployeeSituation.EMPLOYED,
      },
    });

    if (!findEmployee) {
      // O Error vai pular para o Unauthorized no catch e a mensagem será esta
      throw new Error('Usuário não encontrado ou inativo');
    }

    const create = await this.CreateTokensEmployee(
      findEmployee,
      refreshTokenDto.refreshToken,
    );

    return create;
  }

  async RefreshTokensUser(refreshTokenDto: RefreshTokenDTO) {
    const { sub } = await this.jwtService.verifyAsync(
      refreshTokenDto.refreshToken,
      this.jwtConfiguration,
    );

    const findUser = await this.userRepository.findOneBy({
      id: sub,
    });

    if (!findUser) {
      // O Error vai pular para o Unauthorized no catch e a mensagem será esta
      throw new Error('Usuário não encontrado');
    }

    const create = await this.CreateTokensUser(
      findUser,
      refreshTokenDto.refreshToken,
    );

    return create;
  }

  async CreateTokensEmployee(
    employeeData: Employee,
    refreshTokenIncoming: string,
  ) {
    const findUsedRT = await this.FindUsedRefreshTokenEmployee(employeeData);

    const v = await this.RefreshTokenVerify(
      findUsedRT.findUsedAll,
      findUsedRT.findUsedOne,
      refreshTokenIncoming,
      employeeData,
    );

    console.log(v);

    const accessToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeData.email, role: employeeData.role },
    );

    const refreshToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    const create = await this.CreateEmployee(refreshToken, employeeData);

    if (!create) {
      throw new InternalServerErrorException(
        'Erro ao criar registro de refresh token',
      );
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async CreateTokensUser(userData: User, refreshTokenIncoming: string) {
    const accessToken = await this.SignJwtAsync<Partial<User>>(
      userData.id,
      this.jwtConfiguration.jwtTtl,
      { email: userData.email },
    );

    const refreshToken = await this.SignJwtAsync<Partial<User>>(
      userData.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    await this.CreateUser(refreshTokenIncoming, userData);

    return {
      accessToken,
      refreshToken,
    };
  }

  async SignJwtAsync<T>(sub: string, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }
}
