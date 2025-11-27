import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeSituation } from 'src/common/enums/employee-situation.enum';
import { Employee } from 'src/employees/entities/employee.entity';
import { RefreshTokensService } from 'src/refresh-tokens/refresh-token.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import jwtConfig from './config/jwt.config';
import { LoginDTO } from './dto/login.dto';
import { HashingServiceProtocol } from './hashing/hashing.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly hashingService: HashingServiceProtocol,
    private readonly jwtService: JwtService,
    private readonly rtEmployeeService: RefreshTokensService,
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

    return this.CreateTokensEmployee(findEmployee);
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

    await this.rtEmployeeService.Create(refreshToken, employeeData);

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
