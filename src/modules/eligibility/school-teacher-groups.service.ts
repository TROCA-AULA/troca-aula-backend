import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networkInterconnections,
  networks,
  professorSchoolGroups,
  schoolTeacherGroups,
  schools,
  users,
} from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { SetNetworkInterconnectionsDto } from './dto/preferences.dto';
import {
  CreateTeacherGroupDto,
  UpdatePrioritySettingsDto,
  UpdateTeacherGroupDto,
} from './dto/teacher-groups.dto';

// Fase 5 no modelo de GRUPOS por escola (definido com o stakeholder):
// a escola cria grupos (nome + delay), classifica professores e define o
// delay de quem não está em nenhum grupo. O município (rede) define para
// quais redes exibe suas vagas; a escola pode restringir MAIS.
@Injectable()
export class SchoolTeacherGroupsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async get(schoolId: number, requesterId: number) {
    await this.assertManagerOfSchool(schoolId, requesterId);

    const school = await this.drizzle.db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: {
        id: true,
        networkId: true,
        priorityWindowHours: true,
        ungroupedDelayMinutes: true,
        acceptedNetworkIds: true,
      },
    });
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    const groups = await this.drizzle.db.query.schoolTeacherGroups.findMany({
      where: eq(schoolTeacherGroups.schoolId, schoolId),
      orderBy: [asc(schoolTeacherGroups.delayMinutes)],
      with: { members: { columns: { professorId: true } } },
    });

    const interconnections =
      await this.drizzle.db.query.networkInterconnections.findMany({
        where: eq(networkInterconnections.originNetworkId, school.networkId),
      });

    return {
      schoolId,
      ungroupedDelayMinutes: school.ungroupedDelayMinutes,
      // Fallback retrocompatível para escolas que usam o campo antigo.
      fallbackPriorityWindowHours: school.priorityWindowHours ?? null,
      // O que a REDE permite; a escola só pode restringir dentro disso.
      allowedNetworkIds: interconnections.map((row) => row.allowedNetworkId),
      acceptedNetworkIds: school.acceptedNetworkIds ?? null,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        delayMinutes: group.delayMinutes,
        professorIds: (group.members ?? []).map((member) => member.professorId),
      })),
    };
  }

  async createGroup(
    schoolId: number,
    dto: CreateTeacherGroupDto,
    requesterId: number,
  ) {
    await this.assertManagerOfSchool(schoolId, requesterId);

    const [created] = await this.drizzle.db
      .insert(schoolTeacherGroups)
      .values({ schoolId, name: dto.name, delayMinutes: dto.delayMinutes })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      throw new BadRequestException(
        'Já existe um grupo com esse nome nesta escola',
      );
    }

    return this.get(schoolId, requesterId);
  }

  async updateGroup(
    schoolId: number,
    groupId: number,
    dto: UpdateTeacherGroupDto,
    requesterId: number,
  ) {
    await this.assertManagerOfSchool(schoolId, requesterId);
    await this.assertGroupOfSchool(schoolId, groupId);

    const [updated] = await this.drizzle.db
      .update(schoolTeacherGroups)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.delayMinutes !== undefined && {
          delayMinutes: dto.delayMinutes,
        }),
      })
      .where(eq(schoolTeacherGroups.id, groupId))
      .returning();

    if (!updated) {
      throw new BadRequestException(
        'Já existe um grupo com esse nome nesta escola',
      );
    }

    return this.get(schoolId, requesterId);
  }

  async removeGroup(schoolId: number, groupId: number, requesterId: number) {
    await this.assertManagerOfSchool(schoolId, requesterId);
    await this.assertGroupOfSchool(schoolId, groupId);

    await this.drizzle.db
      .delete(schoolTeacherGroups)
      .where(eq(schoolTeacherGroups.id, groupId));

    return this.get(schoolId, requesterId);
  }

  async setMembers(
    schoolId: number,
    groupId: number,
    professorIds: number[],
    requesterId: number,
  ) {
    await this.assertManagerOfSchool(schoolId, requesterId);
    await this.assertGroupOfSchool(schoolId, groupId);

    const unique = [...new Set(professorIds)];
    if (unique.length > 0) {
      const existing = await this.drizzle.db.query.users.findMany({
        where: and(inArray(users.id, unique), notDeleted(users)),
        columns: { id: true },
      });
      if (existing.length !== unique.length) {
        throw new NotFoundException('Um ou mais professores não existem');
      }
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .delete(professorSchoolGroups)
        .where(eq(professorSchoolGroups.groupId, groupId));

      if (unique.length > 0) {
        await tx
          .insert(professorSchoolGroups)
          .values(unique.map((professorId) => ({ professorId, groupId })))
          .onConflictDoNothing();
      }
    });

    return this.get(schoolId, requesterId);
  }

  async updateSettings(
    schoolId: number,
    dto: UpdatePrioritySettingsDto,
    requesterId: number,
  ) {
    await this.assertManagerOfSchool(schoolId, requesterId);

    const school = await this.drizzle.db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: { id: true, networkId: true },
    });
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    // "O mais restritivo vence": a escola só pode aceitar redes que a
    // PRÓPRIA rede já interconectou (nunca abrir mais que o município).
    if (dto.acceptedNetworkIds && dto.acceptedNetworkIds.length > 0) {
      const interconnections =
        await this.drizzle.db.query.networkInterconnections.findMany({
          where: eq(networkInterconnections.originNetworkId, school.networkId),
        });
      const allowed = new Set(
        interconnections.map((row) => row.allowedNetworkId),
      );
      const outside = dto.acceptedNetworkIds.filter((id) => !allowed.has(id));
      if (outside.length > 0) {
        throw new BadRequestException(
          'A escola só pode aceitar redes que o próprio município já interconectou (o mais restritivo vence)',
        );
      }
    }

    await this.drizzle.db
      .update(schools)
      .set({
        ...(dto.ungroupedDelayMinutes !== undefined && {
          ungroupedDelayMinutes: dto.ungroupedDelayMinutes,
        }),
        ...(dto.acceptedNetworkIds !== undefined && {
          acceptedNetworkIds:
            dto.acceptedNetworkIds && dto.acceptedNetworkIds.length > 0
              ? dto.acceptedNetworkIds
              : null,
        }),
      })
      .where(eq(schools.id, schoolId));

    return this.get(schoolId, requesterId);
  }

  private async assertManagerOfSchool(schoolId: number, requesterId: number) {
    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode configurar a prioridade de vagas da sua escola',
      );
    }
  }

  private async assertGroupOfSchool(schoolId: number, groupId: number) {
    const group = await this.drizzle.db.query.schoolTeacherGroups.findFirst({
      where: eq(schoolTeacherGroups.id, groupId),
      columns: { id: true, schoolId: true },
    });
    if (!group || group.schoolId !== schoolId) {
      throw new NotFoundException('Grupo não encontrado nesta escola');
    }
  }
}

@Injectable()
export class NetworkInterconnectionsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async get(networkId: number) {
    await this.assertNetworkExists(networkId);
    const rows = await this.drizzle.db.query.networkInterconnections.findMany({
      where: eq(networkInterconnections.originNetworkId, networkId),
      with: { allowedNetwork: { columns: { id: true, name: true } } },
    });
    return {
      networkId,
      interconnections: rows.map((row) => ({
        networkId: row.allowedNetworkId,
        networkName: row.allowedNetwork?.name ?? null,
      })),
    };
  }

  async replace(networkId: number, dto: SetNetworkInterconnectionsDto) {
    await this.assertNetworkExists(networkId);

    const unique = [...new Set(dto.allowedNetworkIds)];
    if (unique.includes(networkId)) {
      throw new BadRequestException(
        'Uma rede não pode se interconectar com ela mesma',
      );
    }

    if (unique.length > 0) {
      const existing = await this.drizzle.db.query.networks.findMany({
        where: inArray(networks.id, unique),
        columns: { id: true },
      });
      if (existing.length !== unique.length) {
        throw new NotFoundException('Uma ou mais redes informadas não existem');
      }
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .delete(networkInterconnections)
        .where(eq(networkInterconnections.originNetworkId, networkId));

      if (unique.length > 0) {
        await tx.insert(networkInterconnections).values(
          unique.map((allowedNetworkId) => ({
            originNetworkId: networkId,
            allowedNetworkId,
          })),
        );
      }
    });

    return this.get(networkId);
  }

  private async assertNetworkExists(networkId: number) {
    const network = await this.drizzle.db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      columns: { id: true },
    });
    if (!network) {
      throw new NotFoundException('Rede não encontrada');
    }
  }
}
