import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { IsNotEmptyPayloadPipe } from 'src/common/pipes/empty-payload-validation.pipe';
import { PaginationByNameDTO } from '../common/dto/pagination-name.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { SearchByEmailDTO } from './dto/search-email-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @SkipThrottle({ read: true, auth: true, refresh: true, preference: true })
  @Post()
  Create(@Body() body: CreateUserDTO) {
    return this.usersService.Create(body);
  }

  @SkipThrottle({ read: true, auth: true, refresh: true, preference: true })
  @UsePipes(IsNotEmptyPayloadPipe)
  @Patch()
  Update(
    @Body() updateUserDTO: UpdateUserDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.usersService.Update(tokenPayloadDTO, updateUserDTO);
  }

  @SkipThrottle({ write: true, auth: true, refresh: true, preference: true })
  @Get('me')
  FindMe(@TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO) {
    return this.usersService.FindByIdMe(tokenPayloadDTO);
  }

  @SkipThrottle({ write: true, auth: true, refresh: true, preference: true })
  @Public()
  @UseGuards(RoutePolicyGuard)
  @Get('search/email/:email')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByEmail(@Param('email') email: SearchByEmailDTO) {
    return this.usersService.FindByEmail(email);
  }

  @SkipThrottle({ write: true, auth: true, refresh: true, preference: true })
  @Public()
  @UseGuards(RoutePolicyGuard)
  @Get('search/name/')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.usersService.FindByName(paginationByNameDto);
  }
}
