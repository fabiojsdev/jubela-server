import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { RefreshTokenGuard } from 'src/auth/guards/refresh-token.guard';
import { RefreshTokensService } from './refresh-token.service';

@Public()
@UseGuards(RefreshTokenGuard)
@Controller('refresh')
export class RefreshTokensController {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  @Post('user')
  RefreshTokensUser(@Req() req: Request) {
    const token = (req as any).refreshToken;
    return this.refreshTokensService.RefreshTokensUser(token);
  }

  @Post('employee')
  RefreshTokensEmployee(@Req() req: Request) {
    const token = (req as any).refreshToken;
    return this.refreshTokensService.RefreshTokensEmployee(token);
  }
}
