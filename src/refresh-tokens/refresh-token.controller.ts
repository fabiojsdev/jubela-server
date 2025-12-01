import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RefreshTokenGuard } from 'src/auth/guards/refresh-token.guard';
import { Public } from 'src/auth/params/set-metadata';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { RefreshTokensService } from './refresh-token.service';

@Public()
@UseGuards(RefreshTokenGuard)
@Controller('refresh')
export class RefreshTokensController {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  @Post('user')
  RefreshTokensUser(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensUser(refreshTokenDto);
  }

  @Post('employee')
  RefreshTokensEmployee(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.refreshTokensService.RefreshTokensEmployee(refreshTokenDto);
  }
}
