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
import { Public } from 'src/auth/decorators/set-metadata.decorator';
import { SetRoutePolicy } from 'src/auth/decorators/set-route-policy.decorator';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { RoutePolicyGuard } from 'src/auth/guards/route-policy.guard';
import { TokenPayloadParam } from 'src/auth/params/token-payload.param';
import { UpdateUuidDTO } from 'src/common/dto/url-uuid.dto';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { ReqBodyPhoneNumberValidation } from 'src/common/pipes/phone-number-validation-body-request.pipe';
import { PaginationByNameDTO } from '../common/dto/pagination-name.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { SearchByEmailDTO } from './dto/search-email-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @UsePipes(ReqBodyPhoneNumberValidation)
  Create(@Body() body: CreateUserDTO) {
    return this.usersService.Create(body);
  }

  @Patch(':id')
  @UsePipes(ReqBodyPhoneNumberValidation)
  Update(
    @Param('id') id: UpdateUuidDTO,
    @Body() updateUserDTO: UpdateUserDTO,
    @TokenPayloadParam() tokenPayloadDTO: TokenPayloadDTO,
  ) {
    return this.usersService.Update(id, updateUserDTO, tokenPayloadDTO);
  }

  @Public()
  @UseGuards(RoutePolicyGuard)
  @Get('search/email/:email')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByEmail(@Param('email') email: SearchByEmailDTO) {
    return this.usersService.FindByEmail(email);
  }

  @Public()
  @UseGuards(RoutePolicyGuard)
  @Get('search/name/')
  @SetRoutePolicy(EmployeeRole.ADMIN)
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.usersService.FindByName(paginationByNameDto);
  }
}
