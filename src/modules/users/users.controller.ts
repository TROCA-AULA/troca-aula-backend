import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { AssignProfileDto } from './dto/assign-profile.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';

interface AuthenticatedRequest {
  user?: { id: number };
}

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

  // schoolId vem do corpo (AssignProfileDto) — o TenantGuard exige que quem
  // chama já tenha vínculo aprovado NAQUELA escola, e o RolesGuard exige que
  // esse vínculo seja de MASTER/DIRETOR/AUXILIAR_ADMIN. Antes desta guarda,
  // qualquer usuário autenticado podia se auto-atribuir (ou atribuir a
  // qualquer outro userId) o perfil DIRETOR/MASTER em qualquer escola. O
  // vínculo nasce já aprovado (approvedById = quem está chamando), pois só
  // quem já tem poder de gestão naquela escola chega até aqui.
  @Post(':id/assign-profile')
  @UseGuards(AuthGuard, TenantGuard, RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.DIRETOR, ProfileName.AUXILIAR_ADMIN)
  assignProfile(
    @Param('id') id: string,
    @Body() body: AssignProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.assignProfile(
      +id,
      body.profileId,
      body.schoolId,
      req.user!.id,
    );
  }

  // Contraparte do assign-profile: remove o vínculo usuário↔perfil↔escola.
  // Mesmas guardas — quem desvincula precisa ter poder de gestão NAQUELA
  // escola (ou ser MASTER).
  @Post(':id/unassign-profile')
  @UseGuards(AuthGuard, TenantGuard, RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.DIRETOR, ProfileName.AUXILIAR_ADMIN)
  unassignProfile(@Param('id') id: string, @Body() body: AssignProfileDto) {
    return this.usersService.unassignProfile(
      +id,
      body.profileId,
      body.schoolId,
    );
  }

  // Filtros opcionais schoolId/profileId (via UsersProfilesSchools). Sem
  // eles, mantém o comportamento anterior (lista todos). Não há guarda de
  // escola aqui de propósito: a rota já era pública para qualquer usuário
  // autenticado antes desta mudança, e restringir por posse de escola
  // quebraria o uso hoje feito pela área master ao listar globalmente —
  // fica registrado como possível endurecimento futuro (ver docs).
  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll({
      schoolId: query.schoolId,
      profileId: query.profileId,
    });
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
