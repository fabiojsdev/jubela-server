import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
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
      throw new UnauthorizedException(error.stack);
    }
  }

  ExtractTokenFromHeader(request: Request): string | undefined {
    const refreshToken = request.body.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') return;

    return refreshToken;
  }
}
