import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.cookies['refreshToken'];

    if (!token) {
      throw new UnauthorizedException('Não logado');
    }

    if (!token.is_valid) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      await this.jwtService.verifyAsync(token, this.jwtConfiguration);

      (request as any).refreshToken = token;

      return true;
    } catch (error) {
      this.logger.error(`RefreshTokenError: ${error.message}`);
      throw new UnauthorizedException('Erro ao solicitar novos tokens');
    }
  }

  ExtractTokenFromHeader(request: Request): string | undefined {
    const refreshToken = request.body.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') return;

    return refreshToken;
  }
}
