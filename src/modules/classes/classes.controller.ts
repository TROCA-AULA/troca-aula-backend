import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { GetClassDto } from './dto/get-class.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll(@Query() params: GetClassDto) {
    return this.classesService.findAll(params);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(+id, updateClassDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(+id);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Request() req) {
    return this.classesService.enroll(+id, req.user.id);
  }

  @Delete(':id/enroll')
  unenroll(@Param('id') id: string, @Request() req) {
    return this.classesService.unenroll(+id, req.user.id);
  }
}
