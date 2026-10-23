import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
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
  tenant?: { isMaster: boolean };
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
  // Defeito D22: o service ainda confere que o perfil concedido fica
  // ABAIXO do perfil de quem concede (antes um DIRETOR se dava MASTER).
  @Post(':id/assign-profile')
  @UseGuards(AuthGuard, TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
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
  // escola (ou ser MASTER) e só remove perfis abaixo do seu.
  @Post(':id/unassign-profile')
  @UseGuards(AuthGuard, TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  unassignProfile(
    @Param('id') id: string,
    @Body() body: AssignProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.unassignProfile(
      +id,
      body.profileId,
      body.schoolId,
      req.user!.id,
    );
  }

  // Listagem de usuários — só gestão (antes qualquer professor logado via
  // nome, e-mail e telefone de todo mundo). MASTER lista tudo; os demais
  // gestores precisam informar a escola (TenantGuard + RolesGuard conferem
  // que ele gerencia aquela escola) ou buscar um e-mail exato (é assim que
  // o diretor acha um professor recém-cadastrado para vincular).
  @Get()
  @UseGuards(AuthGuard, TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  async findAll(
    @Query() query: FindUsersQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const isMaster = req.tenant?.isMaster ?? false;
    if (!isMaster && query.schoolId === undefined && !query.email) {
      throw new ForbiddenException(
        'Informe a escola (schoolId) ou um e-mail para buscar',
      );
    }
    const users = await this.usersService.findAll({
      schoolId: query.schoolId,
      profileId: query.profileId,
      email: query.email,
    });
    if (!isMaster && query.schoolId === undefined) {
      // Busca por e-mail fora da própria escola: só o básico, sem os
      // vínculos com outras escolas.
      return users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        subjectId: user.subjectId,
      }));
    }
    return users.map(sanitizeUser);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    return user ? sanitizeUser(user) : user;
  }

  // Defeito D1: quem pode alterar o quê é decidido no service (a própria
  // pessoa, MASTER, ou a gestão de uma escola em que ela tem vínculo).
  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const updated = await this.usersService.updateAsRequester(
      +id,
      updateUserDto,
      req.user!.id,
    );
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

  // Defeito D1: apagar conta é só do MASTER (gestor da escola desvincula
  // com unassign-profile, não apaga a pessoa do sistema).
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ProfileName.MASTER)
  async remove(@Param('id') id: string) {
    const removed = await this.usersService.remove(+id);
    return sanitizeUser(removed);
  }
}
