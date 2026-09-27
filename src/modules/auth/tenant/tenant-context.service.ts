import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { users, usersProfilesSchools } from '../../../database/schema';
import { notDeleted } from '../../../database/soft-delete';
import { ProfileName, SchoolLink, TenantContext } from './tenant-context';

// Fonte única de verdade para "a que escolas este usuário tem acesso, e com
// qual perfil" — substitui as duas lógicas divergentes que existiam antes
// (classes.service usando profileId numérico, enrollment-requests.service
// usando upsUser[0] sem checar approvedAt) por uma única resolução, sempre
// filtrada a vínculos aprovados.
@Injectable()
export class TenantContextService {
  constructor(private readonly drizzle: DrizzleService) {}

  async resolve(userId: number): Promise<TenantContext> {
    const user = await this.drizzle.db.query.users.findFirst({
      where: and(eq(users.id, userId), notDeleted(users)),
      with: {
        upsUser: {
          where: isNotNull(usersProfilesSchools.approvedAt),
          with: { profile: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const links: SchoolLink[] = (user.upsUser ?? []).map((link) => ({
      schoolId: link.schoolId,
      profileId: link.profileId,
      profileName: link.profile?.name ?? '',
      approvedAt: link.approvedAt,
    }));

    return {
      userId,
      isMaster: links.some((link) => link.profileName === ProfileName.MASTER),
      links,
      subjectId: user.subjectId ?? null,
    };
  }

  // Usuário MASTER tem acesso a qualquer escola. Fora isso, precisa de um
  // vínculo aprovado NAQUELA escola — e, se allowedProfiles for informado,
  // esse vínculo precisa ter um dos perfis exigidos.
  hasSchoolAccess(
    tenant: TenantContext,
    schoolId: number,
    allowedProfiles?: string[],
  ): boolean {
    if (tenant.isMaster) {
      return true;
    }
    return tenant.links.some(
      (link) =>
        link.schoolId === schoolId &&
        (!allowedProfiles || allowedProfiles.includes(link.profileName)),
    );
  }

  // Checagem de perfil sem escopo de escola (usada quando a rota não tem um
  // schoolId específico para validar, ex.: gestão do catálogo global de
  // disciplinas, ou como fallback grosseiro em rotas por :id de entidade).
  hasAnyRole(tenant: TenantContext, allowedProfiles: string[]): boolean {
    if (tenant.isMaster) {
      return true;
    }
    return tenant.links.some((link) =>
      allowedProfiles.includes(link.profileName),
    );
  }
}
