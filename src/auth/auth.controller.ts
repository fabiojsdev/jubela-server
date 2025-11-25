import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { Public } from './params/set-metadata';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post()
  Login(@Body() loginDto: LoginDTO) {
    return this.authService.Login(loginDto);
  }

  @Public()
  @Post('refresh')
  RefreshTokens(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authService.RefreshTokens(refreshTokenDto);
  }
}
