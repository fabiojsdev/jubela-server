import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { LogoutDTO } from './dto/logout.dto';
import { GoogleAuthGuard } from './guards/guards.guard';
import { GoogleUser } from './interfaces/google-user';
import { Public } from './params/set-metadata';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('employee')
  LoginEmployee(@Body() loginDto: LoginDTO) {
    return this.authService.LoginEmployee(loginDto);
  }

  @Public()
  @Post('logout/employee')
  LogoutEmployee(@Body() logoutDto: LogoutDTO) {
    return this.authService.LogoutEmployee(logoutDto);
  }

  @Public()
  @Post('logout/user')
  LogoutUser(@Body() logoutDto: LogoutDTO) {
    return this.authService.LogoutUser(logoutDto);
  }

  // Não precisa de métodos aqui, só o guard já basta
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  GoogleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async GoogleCallback(
    @Req() req: Request & { user: GoogleUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const createTokens = await this.authService.CreateTokensUser(
      req.user.id,
      req.user.email,
    );

    res.cookie('accessToken', createTokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15, // 15 minutos
      path: '/',
    });

    res.cookie('refreshToken', createTokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: '/auth/refresh',
    });

    return { success: true, message: 'Autenticação concluída' };
  }
}
