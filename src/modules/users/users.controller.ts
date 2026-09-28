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
import { ProfileName, MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { AssignProfileDto } from './dto/assign-profile.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';

interface AuthenticatedRequest {
  user?: { id: number };
}

// Achado de segurança real (não era o objetivo original desta mudança):
// toda rota deste controller devolvia a linha crua de Users, hash bcrypt de
// `password` incluído - qualquer usuário autenticado (PROFESSOR incluído,
// só exige AuthGuard) que chamasse GET /users via o hash de QUALQUER outro
// usuário do sistema. bcrypt não é "seguro o bastante pra vazar" - um hash
// exposto habilita ataque offline de força bruta/dicionário sem precisar
// de mais nada. Corrigido removendo `password` de toda resposta que sai
// deste controller para o cliente.
function sanitizeUser<T extends { password?: unknown }>(
  user: T,
): Omit<T, 'password'> {
  const { password: _password, ...rest } = user;
  return rest;
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

    const created = await this.usersService.create({
      ...createUserDto,
      password: hash,
    });
    return sanitizeUser(created);
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
  async findAll(@Query() query: FindUsersQueryDto) {
    const users = await this.usersService.findAll({
      schoolId: query.schoolId,
      profileId: query.profileId,
    });
    return users.map(sanitizeUser);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    return user ? sanitizeUser(user) : user;
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const updated = await this.usersService.update(+id, updateUserDto);
    return sanitizeUser(updated);
  }

  // Reset de senha por gestor: MASTER em qualquer conta; DIRETOR/
  // AUXILIAR_ADMIN só de usuário que compartilhe uma escola gerenciada por
  // ele (checagem fina no UsersService, já que a rota não tem schoolId).
  @Post(':id/reset-password')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  resetPassword(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.usersService.resetPassword(+id, req.user!.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string) {
    const removed = await this.usersService.remove(+id);
    return sanitizeUser(removed);
  }
}
