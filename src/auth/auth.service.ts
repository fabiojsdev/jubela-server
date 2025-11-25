import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from 'src/employees/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import jwtConfig from './config/jwt.config';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
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
  ) {}

  async Login(loginDTO: LoginDTO) {
    let employeeOrUserData: User | Employee;

    const findEmployee = await this.employeeRepository.findOneBy({
      email: loginDTO.email,
    });

    const findUser = await this.userRepository.findOneBy({
      email: loginDTO.email,
    });

    if (!findEmployee && !findUser) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (findEmployee) employeeOrUserData = { ...findEmployee };
    if (findUser) employeeOrUserData = { ...findUser };

    const passwordCompare = await this.hashingService.Compare(
      loginDTO.password,
      employeeOrUserData.password_hash,
    );

    if (!passwordCompare) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.CreateTokens(employeeOrUserData);
  }

  async CreateTokens(employeeOrUserData: Employee | User) {
    const accessToken = await this.SignJwtAsync<Partial<Employee | User>>(
      employeeOrUserData.id,
      this.jwtConfiguration.jwtTtl,
      { email: employeeOrUserData.email },
    );

    const refreshToken = await this.SignJwtAsync<Partial<Employee | User>>(
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

  async RefreshTokens(refreshTokenDto: RefreshTokenDTO) {
    try {
      let employeeOrUserData: User | Employee;

      const { sub } = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        this.jwtConfiguration,
      );

      const findEmployee = await this.employeeRepository.findOneBy({
        id: sub,
      });

      const findUser = await this.userRepository.findOneBy({
        id: sub,
      });

      if (!findEmployee && !findUser) {
        // O Error vai pular para o Unauthorized no catch e a mensagem será esta
        throw new Error('Usuário não encontrado');
      }

      if (findEmployee) employeeOrUserData = { ...findEmployee };
      if (findUser) employeeOrUserData = { ...findUser };

      return this.CreateTokens(employeeOrUserData);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
