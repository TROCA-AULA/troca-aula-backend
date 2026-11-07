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
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

// Defeito D2: criar/renomear/apagar perfil só exigia estar logado. Os
// perfis são a base de todas as permissões (ids fixos 1-5), então a
// escrita agora é exclusiva do MASTER. Leitura continua aberta a logados.
@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(+id, updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  remove(@Param('id') id: string) {
    return this.profileService.remove(+id);
  }
}
