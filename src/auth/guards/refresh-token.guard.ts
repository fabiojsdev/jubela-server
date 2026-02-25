import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { RefreshTokenEmployee } from 'src/refresh-tokens/entities/refresh-token-employee.entity';
import { RefreshTokenUser } from 'src/refresh-tokens/entities/refresh-token-user.entity';
import { Repository } from 'typeorm';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly logger: Logger,

    @InjectRepository(RefreshTokenEmployee)
    private readonly RTEmployeeRepository: Repository<RefreshTokenEmployee>,

    @InjectRepository(RefreshTokenUser)
    private readonly RTUserRepository: Repository<RefreshTokenUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.cookies['refreshToken'];

    if (!token) {
      throw new UnauthorizedException('Não logado');
    }

    try {
      await this.jwtService.verifyAsync(token, this.jwtConfiguration);

      (request as any).refreshToken = token;

      return true;
    } catch (error) {
      this.logger.error(`RefreshTokenError: ${error.message}`);

      if (error instanceof TokenExpiredError) {
        await this.InvalidateExpiredToken(token);
        throw new UnauthorizedException(
          'Sessão expirada, faça login novamente',
        );
      }

      throw new UnauthorizedException('Erro ao solicitar novos tokens');
    }
  }

  ExtractTokenFromHeader(request: Request): string | undefined {
    const refreshToken = request.body.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') return;

    return refreshToken;
  }

  private ExtractTokenData(token: string) {
    const payload = this.jwtService.decode(token) as {
      id?: string;
      sub?: string;
      role?: string;
    };

    if (!payload?.id) return;

    return payload;
  }

  private async InvalidateExpiredToken(token: string): Promise<void> {
    try {
      const extractedData = this.ExtractTokenData(token);

      if (extractedData) {
        const { role, id } = extractedData;

        if (role) {
          const rtEmployeeUpdate = await this.RTEmployeeRepository.update(
            { token_id: id },
            { is_valid: false },
          );

          if (!rtEmployeeUpdate || rtEmployeeUpdate.affected === 0) {
            this.logger.error(
              'Erro ao atualizar estado de token do funcionário',
            );
          }
        }

        const rtUserUpdate = await this.RTUserRepository.update(
          { token_id: id },
          { is_valid: false },
        );

        if (!rtUserUpdate || rtUserUpdate.affected === 0) {
          this.logger.error('Erro ao atualizar estado de token do usuário');
        }
      }
    } catch (err) {
      this.logger.error(`Erro ao invalidar token expirado: ${err.message}`);
    }
  }
}
