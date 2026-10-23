import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository, FindAllUsersFilter } from './users.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EmailService } from '../email/email.service';
import {
  MANAGER_PROFILES,
  PROFILE_IDS,
  PROFILE_RANK,
  ProfileName,
  TenantContext,
} from '../auth/tenant/tenant-context';

// Erro do Postgres para violação de UNIQUE (e-mail repetido).
function hasPgCode(error: unknown, code: string): boolean {
  const err = error as { code?: string; cause?: { code?: string } };
  return err?.code === code || err?.cause?.code === code;
}
function isUniqueViolation(error: unknown): boolean {
  return hasPgCode(error, '23505');
}
// Chave estrangeira inexistente (hoje só residenceNetworkId tem FK em Users).
function isForeignKeyViolation(error: unknown): boolean {
  return hasPgCode(error, '23503');
}
const UNKNOWN_NETWORK = 'Município (rede) não encontrado';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService,
    private readonly tenantContextService: TenantContextService,
    private readonly emailService: EmailService,
  ) {}
  // Defeito D13: e-mail repetido virava erro 500 genérico.
  async create(createUserDto: CreateUserDto) {
    try {
      return await this.usersRepository.create(createUserDto);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(UNKNOWN_NETWORK);
      }
      throw error;
    }
  }

  // Maior perfil que o usuário tem NAQUELA escola (MASTER vale em todas).
  private rankInSchool(tenant: TenantContext, schoolId: number): number {
    if (tenant.isMaster) return PROFILE_RANK.MASTER;
    return Math.max(
      0,
      ...tenant.links
        .filter((link) => link.schoolId === schoolId)
        .map((link) => PROFILE_RANK[link.profileName] ?? 0),
    );
  }

  private profileNameById(profileId: number): string | undefined {
    return Object.entries(PROFILE_IDS).find(([, id]) => id === profileId)?.[0];
  }

  // Defeito D22: antes, qualquer gestor da escola podia conceder QUALQUER
  // perfil — inclusive MASTER a si mesmo. Agora só se concede perfil
  // ABAIXO do seu (MASTER concede qualquer um). Coordenador municipal não
  // é por escola: usa /network-coordinators.
  private async assertCanGrant(
    requesterId: number,
    profileId: number,
    schoolId: number,
  ) {
    const profileName = this.profileNameById(profileId);
    if (!profileName) {
      throw new BadRequestException('Perfil inexistente');
    }
    if (profileName === ProfileName.COORDENADOR_MUNICIPAL) {
      throw new BadRequestException(
        'Coordenador municipal é vinculado à rede, não à escola (use /network-coordinators)',
      );
    }
    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !tenant.isMaster &&
      PROFILE_RANK[profileName] >= this.rankInSchool(tenant, schoolId)
    ) {
      throw new ForbiddenException(
        'Você só pode conceder ou remover perfis abaixo do seu',
      );
    }
  }

  async assignProfile(
    userId: number,
    profileId: number,
    schoolId: number,
    approvedById: number,
  ) {
    await this.assertCanGrant(approvedById, profileId, schoolId);
    const target = await this.usersRepository.findOne(userId);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.usersRepository.assignProfile(
      userId,
      profileId,
      schoolId,
      approvedById,
    );
  }

  async unassignProfile(
    userId: number,
    profileId: number,
    schoolId: number,
    requesterId: number,
  ) {
    await this.assertCanGrant(requesterId, profileId, schoolId);
    return this.usersRepository.unassignProfile(userId, profileId, schoolId);
  }

  findAll(filter?: FindAllUsersFilter) {
    return this.usersRepository.findAll(filter);
  }

  findOne(id: number) {
    return this.usersRepository.findOne(id);
  }
  findOneBy(email: string) {
    return this.usersRepository.findOneBy(email);
  }

  findOneForToken(id: number) {
    return this.usersRepository.findOneForToken(id);
  }

  // Uso interno (AuthService): grava o hash de uma senha já validada.
  updatePassword(id: number, passwordHash: string) {
    return this.usersRepository.update(id, { password: passwordHash });
  }

  // Defeito D1: antes qualquer pessoa logada alterava QUALQUER conta.
  // Regras agora:
  //  - a própria pessoa: nome, e-mail, telefone; e a disciplina só se
  //    ainda não tiver uma (primeiro preenchimento);
  //  - MASTER: tudo, em qualquer conta;
  //  - gestor (diretor/auxiliar/coordenador) de uma escola em que a pessoa
  //    tem vínculo aprovado: tudo, inclusive disciplina e limite de
  //    substituições (D6) — exceto contas MASTER.
  async updateAsRequester(id: number, dto: UpdateUserDto, requesterId: number) {
    const target = await this.usersRepository.findOne(id);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isSelf = id === requesterId;
    const canManage = await this.canManageUser(target, requesterId);

    if (!isSelf && !canManage) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este usuário',
      );
    }
    if (!canManage) {
      if (dto.substitutionLimitPerSemester !== undefined) {
        throw new ForbiddenException(
          'Só a gestão da escola pode definir o limite de substituições',
        );
      }
      if (
        dto.subjectId !== undefined &&
        target.subjectId !== null &&
        dto.subjectId !== target.subjectId
      ) {
        throw new ForbiddenException(
          'Para trocar a sua disciplina, peça à direção da escola',
        );
      }
    }

    try {
      return await this.usersRepository.update(id, { ...dto });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(UNKNOWN_NETWORK);
      }
      throw error;
    }
  }

  private async canManageUser(
    target: {
      id: number;
      upsUser?: Array<{
        schoolId: number;
        profileId: number;
        approvedAt: Date | null;
      }>;
    },
    requesterId: number,
  ): Promise<boolean> {
    const tenant = await this.tenantContextService.resolve(requesterId);
    if (tenant.isMaster) return true;

    const targetLinks = (target.upsUser ?? []).filter((l) => l.approvedAt);
    if (targetLinks.some((l) => l.profileId === PROFILE_IDS.MASTER)) {
      return false;
    }
    // Hierarquia (como no D22): só mexe na conta de quem tem perfil ABAIXO
    // do seu — senão a secretaria redefiniria a senha da diretora e
    // entraria como ela. Vale o MAIOR perfil da pessoa em qualquer escola.
    const targetRank = Math.max(
      0,
      ...targetLinks.map(
        (l) => PROFILE_RANK[this.profileNameById(l.profileId) ?? ''] ?? 0,
      ),
    );
    const managerSchoolIds = tenant.links
      .filter((link) =>
        (MANAGER_PROFILES as string[]).includes(link.profileName),
      )
      .map((link) => link.schoolId);
    return targetLinks.some(
      (l) =>
        managerSchoolIds.includes(l.schoolId) &&
        this.rankInSchool(tenant, l.schoolId) > targetRank,
    );
  }

  // Redefinição de senha por gestor (contraparte do fluxo de senha
  // temporária do painel Master, que só existia na criação da conta). A
  // senha é gerada no servidor e devolvida UMA vez para quem redefiniu
  // repassar — não há envio por e-mail (visão de futuro).
  async resetPassword(targetId: number, requesterId: number) {
    const target = await this.usersRepository.findOne(targetId);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // MASTER redefine qualquer conta; gestor só de quem tem vínculo numa
    // escola que ele gerencia — e nunca de uma conta MASTER.
    if (!(await this.canManageUser(target, requesterId))) {
      throw new ForbiddenException(
        'Sem permissão para redefinir a senha deste usuário',
      );
    }

    // 9 bytes -> 12 caracteres: respeita o mínimo de 8 da troca de senha.
    const tempPassword = randomBytes(9).toString('base64url');
    const saltRounds = this.config.get<number>('saltRounds') as number;
    await this.usersRepository.update(targetId, {
      password: await bcrypt.hash(tempPassword, saltRounds),
    });

    // Com SMTP configurado, a pessoa recebe a senha por e-mail; sem SMTP
    // (ou se o envio falhar), o gestor repassa a senha devolvida aqui.
    const emailSent = await this.emailService.send({
      to: target.email,
      subject: 'Troca Aula — sua senha temporária',
      text: [
        `Olá, ${target.name}.`,
        '',
        `Sua senha temporária do Troca Aula é: ${tempPassword}`,
        '',
        'Entre com ela e troque por uma senha sua em "Alterar senha".',
        'Se você não esperava esta mensagem, avise a direção da sua escola.',
      ].join('\n'),
    });

    return { tempPassword, emailSent };
  }

  remove(id: number) {
    return this.usersRepository.remove(id);
  }
}
