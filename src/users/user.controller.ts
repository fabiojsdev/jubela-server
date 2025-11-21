import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDTO } from './dto/create-user.dto';
import { PaginationDTO } from './dto/pagination-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  Create(@Body() body: CreateUserDTO) {
    return this.usersService.Create(body);
  }

  @Patch(':id')
  Update(@Param('id') id: string, @Body() updateUserDTO: UpdateUserDTO) {
    return this.usersService.Update(id, updateUserDTO);
  }

  @Get('search/email/:email')
  FindByEmail(@Param('email') email: string) {
    return this.usersService.FindByEmail(email);
  }

  @Get('search/phoneNumber/:phoneNumber')
  FindByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.usersService.FindByPhoneNumber(phoneNumber);
  }

  @Get('search/name/')
  FindByName(@Query() paginationDto: PaginationDTO) {
    return this.usersService.FindByName(paginationDto);
  }
}
