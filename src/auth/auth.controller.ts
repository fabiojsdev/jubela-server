import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { LogoutDTO } from './dto/logout.dto';
import { GoogleAuthGuard } from './guards/guards.guard';
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
  @Post('logout/employee')
  LogoutEmployee(@Body() logoutDto: LogoutDTO) {
    return this.authService.LogoutEmployee(logoutDto);
  }

  @Public()
  @Post('logout/user')
  LogoutUser(@Body() logoutDto: LogoutDTO) {
    return this.authService.LogoutUser(logoutDto);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  GoogleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  GoogleCallback() {}
}
