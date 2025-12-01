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
import { REQUEST_TOKEN_PAYLOAD_KEY } from '../auth.constants';
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
    const token = this.ExtractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Não logadoooooo');
    }

    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        this.jwtConfiguration,
      );

      request[REQUEST_TOKEN_PAYLOAD_KEY] = payload;

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
