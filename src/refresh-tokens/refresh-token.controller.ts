import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/auth/params/set-metadata';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { RefreshTokensService } from './refresh-token.service';

@Controller('refresh')
export class RefreshTokensController {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  @Public()
  @Post('user')
  RefreshTokensUser(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensUser(refreshTokenDto);
  }

  @Public()
  @Post('employee')
  RefreshTokensEmployee(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensEmployee(refreshTokenDto);
  }
}
