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

  async Create(refreshToken: string, sub: Employee) {
    try {
      await this.FindUsedRefreshToken(refreshToken, sub);

      const hashedRefreshToken = await this.hashingService.Hash(refreshToken);

      const rtData = {
        refresh_token: hashedRefreshToken,
        is_valid: true,
        employee: sub,
      };

      const rtCreate = this.RTEmployeeRepository.create(rtData);

      await this.RTEmployeeRepository.save(rtCreate);
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        where: 'Create',
      });
    }
  }

  async FindUsedRefreshToken(refreshToken: string, sub: Employee) {
    try {
      const findUsedRefreshToken = await this.RTEmployeeRepository.findOne({
        where: {
          employee: {
            id: sub.id,
          },
          is_valid: true,
        },
      });

      if (findUsedRefreshToken) {
        const refreshTokenCompare = await this.hashingService.Compare(
          refreshToken,
          findUsedRefreshToken.refresh_token,
        );

        if (
          refreshTokenCompare === true &&
          findUsedRefreshToken.is_valid !== true
        ) {
          // Acionar um alerta aqui por email também
          this.RevokeAll(sub);
        }

        const updateIsValid = await this.RTEmployeeRepository.update(
          findUsedRefreshToken.id,
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
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        where: 'FindUsedRefreshToken',
      });
    }
  }

  async RevokeAll(sub: Employee) {
    try {
      const findAllUserRT = await this.RTEmployeeRepository.find({
        where: {
          employee: {
            id: sub.id,
          },
        },
      });

      for (let i = 0; i < findAllUserRT.length; i++) {
        this.RTEmployeeRepository.update(findAllUserRT[i].id, {
          is_valid: false,
        });
      }

      throw new UnauthorizedException('Acessos revogados, contate o suporte');
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        where: 'RevokeAll',
      });
    }
  }

  async RefreshTokensEmployee(refreshTokenDto: RefreshTokenDTO) {
    try {
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
        throw new Error('Usuário não encontrado');
      }

      return this.CreateTokensEmployee(findEmployee);
    } catch (error) {
      throw new UnauthorizedException({
        message: error.message,
        where: 'RefreshTokensEmployee',
      });
    }
  }

  async RefreshTokensUser(refreshTokenDto: RefreshTokenDTO) {
    try {
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

      return this.CreateTokensUser(findUser);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  async CreateTokensEmployee(employeeData: Employee) {
    const accessToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeData.email, role: employeeData.role },
    );

    const refreshToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async CreateTokensUser(employeeOrUserData: User) {
    const accessToken = await this.SignJwtAsync<Partial<User>>(
      employeeOrUserData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeOrUserData.email },
    );

    const refreshToken = await this.SignJwtAsync<Partial<User>>(
      employeeOrUserData.id,
      this.jwtConfiguration.jwtRefreshTtl,
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
