import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { RefreshTokenGuard } from 'src/auth/guards/refresh-token.guard';
import { RefreshTokensService } from './refresh-token.service';

@Public()
@UseGuards(RefreshTokenGuard)
@Controller('refresh')
export class RefreshTokensController {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  @Post('user')
  async RefreshTokensUser(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as any).refreshToken;

    const getRefreshToken =
      await this.refreshTokensService.RefreshTokensUser(token);

    res.cookie('accessToken', getRefreshToken.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 20, // 20 minutos
      path: '/',
    });

    res.cookie('refreshToken', getRefreshToken.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: '/auth/refresh',
    });

    return { success: true, message: 'Reutenticação concluída' };
  }

  @Post('employee')
  async RefreshTokensEmployee(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as any).refreshToken;
    const getRefreshToken =
      await this.refreshTokensService.RefreshTokensEmployee(token);

    res.cookie('accessToken', getRefreshToken.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 20, // 20 minutos
      path: '/',
    });

    res.cookie('refreshToken', getRefreshToken.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: '/auth/refresh',
    });

    return { success: true, message: 'Reutenticação concluída' };
  }
}
