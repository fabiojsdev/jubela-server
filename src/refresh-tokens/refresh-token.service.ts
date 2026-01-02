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
import { EmployeeSituation } from 'src/common/enums/employee-situation.enum';
import { RTAlertDTO } from 'src/email/dto/rt-alert.dto';
import { EmailService } from 'src/email/email.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
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
    private readonly emailsService: EmailService,
  ) {}

  async CreateEmployee(sub: Employee) {
    const rtData = {
      is_valid: true,
      employee: sub,
    };

    const rtCreate = this.RTEmployeeRepository.create(rtData);

    const newRT = await this.RTEmployeeRepository.save(rtCreate);

    return {
      ...newRT,
    };
  }

  async CreateUser(sub: User) {
    const rtData = {
      is_valid: true,
      user: sub,
    };

    const rtCreate = this.RTUserRepository.create(rtData);

    const newRT = await this.RTUserRepository.save(rtCreate);

    return {
      ...newRT,
    };
  }

  async FindUsedRefreshTokenEmployee(refreshTokenId: string, sub: Employee) {
    const findUsedRefreshToken = await this.RTEmployeeRepository.findOne({
      where: {
        token_id: refreshTokenId,
        employee: {
          id: sub.id,
        },
      },
    });

    if (!findUsedRefreshToken) {
      throw new InternalServerErrorException(
        'Erro ao buscar refresh tokens relacionados ao funcionário',
      );
    }

    return findUsedRefreshToken;
  }

  async RefreshTokenVerifyEmployee(
    refreshTokenData: RefreshTokenEmployee,
    sub: Employee,
  ) {
    if (refreshTokenData.is_valid !== true) {
      return this.RevokeAllEmployee(sub, false, refreshTokenData.token_id);
    } else {
      return 'Token válido. Sem incidentes';
    }
  }

  async RefreshTokenVerifyUser(refreshTokenData: RefreshTokenUser, sub: User) {
    if (refreshTokenData.is_valid !== true) {
      return this.RevokeAllUser(sub, false, refreshTokenData.token_id);
    } else {
      return 'Token válido. Sem incidentes';
    }
  }

  async FindUsedRefreshTokenUser(refreshTokenId: string, sub: User) {
    const findUsedRefreshToken = await this.RTUserRepository.findOne({
      where: {
        token_id: refreshTokenId,
        user: {
          id: sub.id,
        },
      },
    });

    if (!findUsedRefreshToken) {
      throw new InternalServerErrorException(
        'Erro ao buscar refresh tokens relacionados ao usuário',
      );
    }

    return findUsedRefreshToken;
  }

  async RevokeAllEmployee(sub: Employee, isLogout: boolean, tokenId?: string) {
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

      if (isLogout) return;

      const date = new Date();
      const day = date.getDay().toString();
      const month = date.getMonth().toString();
      const year = date.getFullYear().toString();
      const hour = date.getHours().toString();
      const minutes = date.getMinutes().toString();

      const alertData: RTAlertDTO = {
        email: sub.email,
        userId: sub.id,
        tokenId,
        occurredAt: `${day}/${month}/${year} - ${hour}:${minutes}`,
      };

      await this.emailsService.SendRTAlertEmployees(alertData, true);
      await this.emailsService.SendRTAlertEmployees(alertData, false);

      throw new Error('Acessos revogados, contate o suporte');
    } catch (error) {
      throw new UnauthorizedException({
        message: error.message,
        where: 'RevokeAll',
      });
    }
  }

  async RevokeAllUser(sub: User, isLogout: boolean, tokenId?: string) {
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

      if (isLogout) return;

      const date = new Date();
      const day = date.getDay().toString();
      const month = date.getMonth().toString();
      const year = date.getFullYear().toString();
      const hour = date.getHours().toString();
      const minutes = date.getMinutes().toString();

      // A URL DO LOGIN PODE SER OUTRA, NÃO ESTA
      const alertData: RTAlertDTO = {
        email: sub.email,
        userId: sub.id,
        tokenId,
        occurredAt: `${day}/${month}/${year} - ${hour}:${minutes}`,
        loginUrl: 'https://jubela-client.vercel.app/login',
      };

      await this.emailsService.SendRTAlertUsers(alertData, true);
      await this.emailsService.SendRTAlertUsers(alertData, false);

      throw new Error('Acessos revogados, contate o suporte');
    } catch (error) {
      throw new UnauthorizedException({
        message: error.message,
        where: 'RevokeAll',
      });
    }
  }

  async RefreshTokensEmployee(refreshToken: string) {
    const { sub, id } = await this.jwtService.verifyAsync(
      refreshToken,
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

    const create = await this.CreateTokensEmployee(findEmployee, id);

    return create;
  }

  async RefreshTokensUser(refreshToken: string) {
    const { sub, id } = await this.jwtService.verifyAsync(
      refreshToken,
      this.jwtConfiguration,
    );

    const findUser = await this.userRepository.findOneBy({
      id: sub,
    });

    if (!findUser) {
      // O Error vai pular para o Unauthorized no catch e a mensagem será esta
      throw new Error('Usuário não encontrado');
    }

    const create = await this.CreateTokensUser(findUser, id);

    return create;
  }

  async InvalidateRefreshToken(id: string) {
    const invalidate = await this.RTEmployeeRepository.update(id, {
      is_valid: false,
    });

    return invalidate;
  }

  async CreateTokensEmployee(
    employeeData: Employee,
    refreshTokenIdIncoming: string,
  ) {
    const findUsedRT = await this.FindUsedRefreshTokenEmployee(
      refreshTokenIdIncoming,
      employeeData,
    );

    await this.RefreshTokenVerifyEmployee(findUsedRT, employeeData);

    const invalidate = await this.InvalidateRefreshToken(findUsedRT.id);

    if (!invalidate) {
      throw new InternalServerErrorException(
        'Erro ao atualizar estado de refresh token',
      );
    }

    const create = await this.CreateEmployee(employeeData);

    if (!create) {
      throw new InternalServerErrorException(
        'Erro ao criar registro de refresh token',
      );
    }

    const accessToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeData.email, role: employeeData.role },
    );

    const refreshToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtRefreshTtl,
      { id: create.token_id },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async CreateTokensUser(userData: User, refreshTokenIncoming: string) {
    const findUsedRT = await this.FindUsedRefreshTokenUser(
      refreshTokenIncoming,
      userData,
    );

    await this.RefreshTokenVerifyUser(findUsedRT, userData);

    const invalidate = await this.InvalidateRefreshToken(findUsedRT.id);

    if (!invalidate) {
      throw new InternalServerErrorException(
        'Erro ao atualizar estado de refresh token',
      );
    }

    const create = await this.CreateUser(userData);

    if (!create) {
      throw new InternalServerErrorException(
        'Erro ao criar registro de refresh token',
      );
    }

    const accessToken = await this.SignJwtAsync<Partial<Employee>>(
      userData.id,
      this.jwtConfiguration.jwtTtl,
      { email: userData.email },
    );

    const refreshToken = await this.SignJwtAsync<Partial<User>>(
      userData.id,
      this.jwtConfiguration.jwtRefreshTtl,
      { id: create.token_id },
    );

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
