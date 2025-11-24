import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { UpdateUuidDTO } from 'src/common/dto/update-uuid.dto';
import { ReqBodyPhoneNumberValidation } from 'src/common/pipes/phone-number-validation-body-request.pipe';
import { FindByPhoneNumberValidation } from 'src/common/pipes/phone-number-validation.pipe';
import { PaginationByNameDTO } from '../common/dto/pagination-name.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { SearchByEmailDTO } from './dto/search-email-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(ReqBodyPhoneNumberValidation)
  Create(@Body() body: CreateUserDTO) {
    return this.usersService.Create(body);
  }

  @Patch(':id')
  @UsePipes(ReqBodyPhoneNumberValidation)
  Update(@Param('id') id: UpdateUuidDTO, @Body() updateUserDTO: UpdateUserDTO) {
    return this.usersService.Update(id, updateUserDTO);
  }

  @Get('search/email/:email')
  FindByEmail(@Param('email') email: SearchByEmailDTO) {
    return this.usersService.FindByEmail(email);
  }

  @Get('search/phoneNumber/:phoneNumber')
  @UsePipes(FindByPhoneNumberValidation)
  FindByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.usersService.FindByPhoneNumber(phoneNumber);
  }

  @Get('search/name/')
  FindByName(@Query() paginationByNameDto: PaginationByNameDTO) {
    return this.usersService.FindByName(paginationByNameDto);
  }
}
