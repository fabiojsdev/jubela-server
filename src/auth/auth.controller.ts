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
import { Public } from './decorators/set-metadata.decorator';
import { LoginDTO } from './dto/login.dto';
import { LogoutDTO } from './dto/logout.dto';
import { GoogleAuthGuard } from './guards/google.guard';
import { GoogleUser } from './interfaces/google-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('employee')
  async LoginEmployee(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDTO,
  ) {
    const createTokens = await this.authService.LoginEmployee(loginDto);

    res.cookie('accessToken', createTokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 20, // 20 minutos
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

  @Public()
  @Post('logout/employee')
  async LogoutEmployee(@Body() logoutDto: LogoutDTO) {
    await this.authService.LogoutEmployee(logoutDto);
    return { success: true, message: 'Logout concluído' };
  }

  @Public()
  @Post('logout/user')
  async LogoutUser(@Body() logoutDto: LogoutDTO) {
    await this.authService.LogoutUser(logoutDto);
    return { success: true, message: 'Logout concluído' };
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
      maxAge: 1000 * 60 * 20, // 20 minutos
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
