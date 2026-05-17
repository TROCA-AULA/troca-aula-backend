import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/auth.guard';
import { AssignProfileDto } from './dto/assign-profile.dto';
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const saltHounds = this.config.get<number>('saltRounds') as number;

    const hash = await bcrypt.hash(createUserDto.password, saltHounds);

    return this.usersService.create({ ...createUserDto, password: hash });
  }

  @Post(':id/assign-profile')
  @UseGuards(AuthGuard)
  assignProfile(@Param('id') id: string, @Body() body: AssignProfileDto) {
    return this.usersService.assignProfile(+id, body.profileId, body.schoolId);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
