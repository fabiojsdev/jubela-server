import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RefreshTokenGuard } from 'src/auth/guards/refresh-token.guard';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { RefreshTokensService } from './refresh-token.service';

@Controller('refresh')
export class RefreshTokensController {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  @UseGuards(RefreshTokenGuard)
  @Post('user')
  RefreshTokensUser(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensUser(refreshTokenDto);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('employee')
  RefreshTokensEmployee(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensEmployee(refreshTokenDto);
  }
}
