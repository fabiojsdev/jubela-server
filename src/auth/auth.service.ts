import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeSituation } from 'src/common/enums/employee-situation.enum';
import { Employee } from 'src/employees/entities/employee.entity';
import { RefreshTokensService } from 'src/refresh-tokens/refresh-token.service';
import { CreateUserDTO } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/user.service';
import { Repository } from 'typeorm';
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

  async LoginUser(loginDTO: LoginDTO) {
    const findUser = await this.userRepository.findOneBy({
      email: loginDTO.email,
    });

    if (!findUser && !findUser) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordCompare = await this.hashingService.Compare(
      loginDTO.password,
      findUser.password_hash,
    );

    if (!passwordCompare) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.CreateTokensUser(findUser);
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
    const accessToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeData.email, role: employeeData.role },
    );

    const refreshToken = await this.SignJwtAsync<Partial<Employee>>(
      employeeData.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    const create = await this.refreshTokenService.CreateEmployee(employeeData);

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

  async CreateTokensUser(userData: User) {
    const accessToken = await this.SignJwtAsync<Partial<User>>(
      userData.id,
      this.jwtConfiguration.jwtTtl,
      { email: userData.email },
    );

    const refreshToken = await this.SignJwtAsync<Partial<User>>(
      userData.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    const create = await this.refreshTokenService.CreateUser(userData);

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
