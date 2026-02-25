import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from './auth.service';
import { Public } from './decorators/set-metadata.decorator';
import { LoginDTO } from './dto/login.dto';
import { LogoutDTO } from './dto/logout.dto';
import { GoogleAuthGuard } from './guards/google.guard';
import { GoogleAuthUser } from './params/google-user.param';

// @SkipCsrf()
@SkipThrottle({ read: true, write: true })
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
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 20, // 20 minutos
      path: '/',
    });

    res.cookie('refreshToken', createTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: '/refresh/employee',
    });

    return {
      success: true,
      message: 'Autenticação concluída',
      email: createTokens.email,
      name: createTokens.name,
      id: createTokens.id,
    };
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
    @GoogleAuthUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const createTokens = await this.authService.CreateTokensUser(user);

    res.cookie('accessToken', createTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 1000 * 60 * 20, // 20 minutos
      path: '/',
    });

    res.cookie('refreshToken', createTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      path: '/refresh/user',
    });

    return {
      success: true,
      message: 'Autenticação concluída',
      email: createTokens.email,
      name: createTokens.name,
      id: createTokens.id,
    };
  }
}
