import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeSituation } from 'src/common/enums/employee-situation.enum';
import { EmailService } from 'src/email/email.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { LogsService } from 'src/logs-register/log.service';
import { RefreshTokensService } from 'src/refresh-tokens/refresh-token.service';
import { CreateUserDTO } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/user.service';
import { DataSource, Repository } from 'typeorm';
import { JWTBlacklist } from '../jwt-blacklist/entities/jwt_blacklist.entity';
import jwtConfig from './config/jwt.config';
import { LoginDTO } from './dto/login.dto';
import { LogoutDTO } from './dto/logout.dto';
import { HashingServiceProtocol } from './hashing/hashing.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(JWTBlacklist)
    private readonly jwtBlacklistRepository: Repository<JWTBlacklist>,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly hashingService: HashingServiceProtocol,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokensService,
    private readonly userService: UsersService,
    private readonly logService: LogsService,
    private readonly emailsService: EmailService,
    private readonly logger: Logger,
    private dataSource: DataSource,
  ) {}

  async LoginEmployee(loginDTO: LoginDTO) {
    const findEmployee = await this.employeeRepository.findOneBy({
      email: loginDTO.email,
      situation: EmployeeSituation.EMPLOYED,
    });

    if (!findEmployee) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordCompare = await this.hashingService.Compare(
      loginDTO.password,
      findEmployee.password_hash,
    );

    if (!passwordCompare) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const create = await this.CreateTokensEmployee(findEmployee);

    return create;
  }

  async LogoutEmployee(logoutDto: LogoutDTO) {
    const jwtBlacklistData = {
      email: logoutDto.email,
      token: logoutDto.token,
    };

    const findEmployee = await this.employeeRepository.findOne({
      where: {
        email: logoutDto.email,
      },
    });

    await this.refreshTokenService.RevokeAllEmployee(findEmployee, true);

    const createLogout = this.jwtBlacklistRepository.create(jwtBlacklistData);

    await this.jwtBlacklistRepository.save(createLogout);

    return 'Logout criado com suceso';
  }

  async LogoutUser(logoutDto: LogoutDTO) {
    const jwtBlacklistData = {
      email: logoutDto.email,
      token: logoutDto.token,
    };

    const findUser = await this.userRepository.findOne({
      where: {
        email: logoutDto.email,
      },
    });

    await this.refreshTokenService.RevokeAllUser(findUser, true);

    const createLogout = this.jwtBlacklistRepository.create(jwtBlacklistData);

    await this.jwtBlacklistRepository.save(createLogout);

    return 'Logout criado com suceso';
  }

  async CreateTokensEmployee(employeeData: Employee) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let accessToken: string = '';
    let refreshToken: string = '';

    try {
      await this.refreshTokenService.CreateEmployee(employeeData, queryRunner);

      accessToken = await this.SignJwtAsync(
        employeeData.id,
        this.jwtConfiguration.jwtTtl,
        { email: employeeData.email, role: employeeData.role },
      );

      refreshToken = await this.SignJwtAsync(
        employeeData.id,
        this.jwtConfiguration.jwtRefreshTtl,
      );

      const dataForLog = {
        email: employeeData.email,
        name: employeeData.name,
        employee: employeeData,
      };

      await this.logService.CreateLogEmployee(dataForLog, queryRunner);

      await queryRunner.commitTransaction();

      return {
        accessToken,
        refreshToken,
        email: employeeData.email,
        name: employeeData.name,
        id: employeeData.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(`Erro ao criar novo par de tokens: ${error.message}`);

      try {
        await this.emailsService.LogIssue('funcionário');
      } catch (emailErr) {
        console.error(
          'Falha ao enviar e-mail de alerta de erro de autenticação',
          emailErr.message,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação da autenticação',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async CreateTokensUser(user: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let accessToken: string = '';
    let refreshToken: string = '';

    try {
      await this.refreshTokenService.CreateUser(user, queryRunner);

      accessToken = await this.SignJwtAsync<Partial<User>>(
        user.id,
        this.jwtConfiguration.jwtTtl,
        { email: user.email },
      );

      refreshToken = await this.SignJwtAsync<Partial<User>>(
        user.id,
        this.jwtConfiguration.jwtRefreshTtl,
      );

      const dataForLog = {
        email: user.email,
        name: user.name,
        user: user,
      };

      await this.logService.CreateLogUser(dataForLog, queryRunner);

      await queryRunner.commitTransaction();

      return {
        accessToken,
        refreshToken,
        email: user.email,
        name: user.name,
        id: user.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(`Erro ao criar novo par de tokens: ${error.message}`);

      try {
        await this.emailsService.LogIssue('usuário');
      } catch (emailErr) {
        console.error(
          'Falha ao enviar e-mail de alerta de erro de autenticação',
          emailErr.message,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação da autenticação',
      );
    } finally {
      await queryRunner.release();
    }
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

  async ValidateGoogleUser(googleUser: CreateUserDTO) {
    const createUser = await this.userService.FindByEmailForGoogle(
      googleUser.email,
    );

    if (createUser) return createUser;

    return await this.userService.Create(googleUser);
  }
}
