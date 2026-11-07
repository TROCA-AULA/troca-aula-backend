import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  schools,
  userNetworkLinks,
  users,
  usersProfilesSchools,
} from '../../../database/schema';
import { notDeleted } from '../../../database/soft-delete';
import {
  PROFILE_IDS,
  ProfileName,
  SchoolLink,
  TenantContext,
} from './tenant-context';

// Fonte única de verdade para "a que escolas este usuário tem acesso, e com
// qual perfil" — substitui as duas lógicas divergentes que existiam antes
// (classes.service usando profileId numérico, enrollment-requests.service
// usando upsUser[0] sem checar approvedAt) por uma única resolução, sempre
// filtrada a vínculos aprovados.
@Injectable()
export class TenantContextService {
  constructor(private readonly drizzle: DrizzleService) {}

  // Roda em leitura privilegiada (DrizzleService.runPrivileged): é o
  // bootstrap do próprio recorte de acesso — precisa ler a rede de cada
  // escola do usuário ANTES de o RLS saber quais redes ele pode ver. Os
  // guards rodam antes do interceptor de RLS, então sem isso o networkId
  // vinha null (defeito D5).
  async resolve(userId: number): Promise<TenantContext> {
    return this.drizzle.runPrivileged(() => this.resolveUnscoped(userId));
  }

  private async resolveUnscoped(userId: number): Promise<TenantContext> {
    const user = await this.drizzle.db.query.users.findFirst({
      where: and(eq(users.id, userId), notDeleted(users)),
      with: {
        upsUser: {
          where: isNotNull(usersProfilesSchools.approvedAt),
          with: {
            profile: true,
            school: { columns: { networkId: true } },
          },
        },
        networkLinks: {
          where: isNotNull(userNetworkLinks.approvedAt),
          columns: { networkId: true, approvedAt: true },
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
      networkId: link.school?.networkId ?? null,
    }));

    // Coordenador municipal: um vínculo "virtual" de gestão para cada
    // escola das redes que ele coordena — assim TODAS as checagens de
    // escola (TenantGuard, RolesGuard, services) já funcionam sem caso
    // especial.
    const networkLinks = user.networkLinks ?? [];
    const coordinatedNetworkIds = networkLinks.map((link) => link.networkId);
    if (coordinatedNetworkIds.length > 0) {
      const networkSchools = await this.drizzle.db.query.schools.findMany({
        where: and(
          inArray(schools.networkId, coordinatedNetworkIds),
          notDeleted(schools),
        ),
        columns: { id: true, networkId: true },
      });
      for (const school of networkSchools) {
        const approvedAt =
          networkLinks.find((link) => link.networkId === school.networkId)
            ?.approvedAt ?? null;
        links.push({
          schoolId: school.id,
          profileId: PROFILE_IDS.COORDENADOR_MUNICIPAL,
          profileName: ProfileName.COORDENADOR_MUNICIPAL,
          approvedAt,
          networkId: school.networkId,
        });
      }
    }

    return {
      userId,
      isMaster: links.some((link) => link.profileName === ProfileName.MASTER),
      links,
      subjectId: user.subjectId ?? null,
      coordinatedNetworkIds,
    };
  }

  // A rede está sob gestão deste usuário? MASTER: qualquer uma;
  // COORDENADOR_MUNICIPAL: só as redes do vínculo dele.
  canManageNetwork(tenant: TenantContext, networkId: number): boolean {
    return (
      tenant.isMaster ||
      (tenant.coordinatedNetworkIds ?? []).includes(networkId)
    );
  }

  async assertCanManageNetwork(userId: number, networkId: number) {
    const tenant = await this.resolve(userId);
    if (!this.canManageNetwork(tenant, networkId)) {
      throw new ForbiddenException(
        'Você só pode gerenciar as redes (municípios) que coordena',
      );
    }
    return tenant;
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
