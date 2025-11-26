import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
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
  @Post('user')
  LoginUser(@Body() loginDto: LoginDTO) {
    return this.authService.LoginUser(loginDto);
  }

  @Public()
  @Post('refreshUser')
  RefreshTokensUser(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authService.RefreshTokensUser(refreshTokenDto);
  }

  @Public()
  @Post('refreshEmployee')
  RefreshTokensEmployee(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authService.RefreshTokensEmployee(refreshTokenDto);
  }
}
