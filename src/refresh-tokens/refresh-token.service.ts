import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import jwtConfig from 'src/auth/config/jwt.config';
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
    private readonly authService: AuthService,
  ) {}

  async RefreshTokensEmployee(refreshTokenDto: RefreshTokenDTO) {
    try {
      const { sub } = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        this.jwtConfiguration,
      );

      const findEmployee = await this.employeeRepository.findOneBy({
        id: sub,
        situation: EmployeeSituation.EMPLOYED,
      });

      if (!findEmployee) {
        // O Error vai pular para o Unauthorized no catch e a mensagem será esta
        throw new Error('Usuário não encontrado');
      }

      return this.authService.CreateTokensEmployee(findEmployee);
    } catch (error) {
      throw new UnauthorizedException(error.message);
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

      return this.authService.CreateTokensUser(findUser);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
