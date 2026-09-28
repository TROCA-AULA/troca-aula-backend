import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networkInterconnections,
  professorNetworkInterests,
  professorSchoolExclusions,
  professorSchoolGroups,
  schoolTeacherGroups,
  schools,
} from '../../database/schema';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EligibilityClassInput, EligibilityVerdict } from './eligibility.types';

interface ProfessorEligibilityContext {
  linkedSchoolIds: Set<number>;
  linkedNetworkIds: Set<number>;
  excludedSchoolIds: Set<number>;
  interestedNetworkIds: Set<number>;
  /** Melhor (menor delay) grupo do professor por escola. */
  groupBySchoolId: Map<number, { name: string; delayMinutes: number }>;
}

interface SchoolEligibilityContext {
  networkId: number;
  ungroupedDelayMinutes: number;
  priorityWindowHours: number | null;
  hasGroups: boolean;
  /** Redes que a própria rede desta escola interconectou (o que o município permite). */
  allowedNetworkIds: Set<number>;
  /** Subconjunto que a ESCOLA aceita (null = todas as permitidas pelo município). */
  acceptedNetworkIds: number[] | null;
}

// Fonte única da regra de VISIBILIDADE de vaga para professor (listagem e
// candidatura usam o mesmo motor). Modelo definido com o stakeholder:
//   - o município (rede) decide para quais municípios exibe suas vagas
//     (NetworkInterconnections, direcional);
//   - a escola pode restringir MAIS (acceptedNetworkIds ⊆ interconexões da
//     rede) — "o mais restritivo vence";
//   - a escola cria grupos de professores com delay próprio; quem está no
//     grupo vê depois do delay do grupo; quem não está em nenhum grupo vê
//     depois do delay padrão da escola (ungroupedDelayMinutes);
//   - exclusão do próprio professor vence qualquer critério.
// Escolas que ainda não criaram grupos mantêm o fallback retrocompatível
// do campo único Schools.priorityWindowHours.
@Injectable()
export class EligibilityService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async assertCanApply(professorId: number, classItem: EligibilityClassInput) {
    const [verdict] = await this.evaluateMany(professorId, [classItem]);
    if (!verdict.visible) {
      throw new ForbiddenException(
        verdict.message ??
          'Esta vaga ainda não está disponível para o seu vínculo',
      );
    }
    return verdict;
  }

  async evaluateMany(
    professorId: number,
    classItems: EligibilityClassInput[],
  ): Promise<EligibilityVerdict[]> {
    if (classItems.length === 0) return [];

    const [professorContext, schoolContexts] = await Promise.all([
      this.loadProfessorContext(professorId),
      this.loadSchoolContexts([
        ...new Set(classItems.map((item) => item.schoolId)),
      ]),
    ]);

    const now = Date.now();
    return classItems.map((item) =>
      this.evaluate(
        item,
        schoolContexts.get(item.schoolId),
        professorContext,
        now,
      ),
    );
  }

  private async loadProfessorContext(
    professorId: number,
  ): Promise<ProfessorEligibilityContext> {
    const tenant = await this.tenantContextService.resolve(professorId);
    const linkedSchoolIds = new Set(tenant.links.map((link) => link.schoolId));
    // O vínculo já traz a rede da escola (claim resolvido pelo
    // TenantContextService) — não precisa de query extra só para isso.
    const linkedNetworkIds = new Set(
      tenant.links
        .map((link) => link.networkId)
        .filter((networkId): networkId is number => networkId !== null),
    );

    const [exclusions, interests, memberships] = await Promise.all([
      this.drizzle.db.query.professorSchoolExclusions.findMany({
        where: eq(professorSchoolExclusions.professorId, professorId),
      }),
      this.drizzle.db.query.professorNetworkInterests.findMany({
        where: eq(professorNetworkInterests.professorId, professorId),
      }),
      this.drizzle.db.query.professorSchoolGroups.findMany({
        where: eq(professorSchoolGroups.professorId, professorId),
        with: {
          group: {
            columns: {
              id: true,
              schoolId: true,
              name: true,
              delayMinutes: true,
            },
          },
        },
      }),
    ]);

    const groupBySchoolId = new Map<
      number,
      { name: string; delayMinutes: number }
    >();
    for (const membership of memberships) {
      const group = membership.group;
      if (!group) continue;
      const current = groupBySchoolId.get(group.schoolId);
      if (!current || group.delayMinutes < current.delayMinutes) {
        groupBySchoolId.set(group.schoolId, {
          name: group.name,
          delayMinutes: group.delayMinutes,
        });
      }
    }

    return {
      linkedSchoolIds,
      linkedNetworkIds,
      excludedSchoolIds: new Set(exclusions.map((row) => row.schoolId)),
      interestedNetworkIds: new Set(interests.map((row) => row.networkId)),
      groupBySchoolId,
    };
  }

  private async loadSchoolContexts(
    schoolIds: number[],
  ): Promise<Map<number, SchoolEligibilityContext>> {
    const map = new Map<number, SchoolEligibilityContext>();
    if (schoolIds.length === 0) return map;

    const schoolRows = await this.drizzle.db.query.schools.findMany({
      where: inArray(schools.id, schoolIds),
      columns: {
        id: true,
        networkId: true,
        priorityWindowHours: true,
        ungroupedDelayMinutes: true,
        acceptedNetworkIds: true,
      },
    });

    const groups = await this.drizzle.db.query.schoolTeacherGroups.findMany({
      where: inArray(schoolTeacherGroups.schoolId, schoolIds),
      columns: { id: true, schoolId: true },
    });

    const networkIds = [...new Set(schoolRows.map((row) => row.networkId))];
    const interconnections =
      networkIds.length > 0
        ? await this.drizzle.db.query.networkInterconnections.findMany({
            where: inArray(networkInterconnections.originNetworkId, networkIds),
          })
        : [];

    const allowedByOrigin = new Map<number, Set<number>>();
    for (const interconnection of interconnections) {
      const set =
        allowedByOrigin.get(interconnection.originNetworkId) ?? new Set();
      set.add(interconnection.allowedNetworkId);
      allowedByOrigin.set(interconnection.originNetworkId, set);
    }

    for (const row of schoolRows) {
      map.set(row.id, {
        networkId: row.networkId,
        ungroupedDelayMinutes: row.ungroupedDelayMinutes ?? 0,
        priorityWindowHours: row.priorityWindowHours ?? null,
        hasGroups: groups.some((group) => group.schoolId === row.id),
        allowedNetworkIds: allowedByOrigin.get(row.networkId) ?? new Set(),
        acceptedNetworkIds: row.acceptedNetworkIds ?? null,
      });
    }

    return map;
  }

  private evaluate(
    item: EligibilityClassInput,
    schoolContext: SchoolEligibilityContext | undefined,
    professorContext: ProfessorEligibilityContext,
    now: number,
  ): EligibilityVerdict {
    // Exclusão do próprio professor vence QUALQUER outro critério.
    if (professorContext.excludedSchoolIds.has(item.schoolId)) {
      return {
        visible: false,
        reason: 'EXCLUDED',
        message:
          'Você excluiu esta escola das suas vagas — remova a exclusão nas suas preferências para voltar a vê-la',
      };
    }

    if (!schoolContext) {
      return { visible: true };
    }

    // Regra do município/mercado: a rede só exibe suas vagas para as redes
    // que interconectou (e a escola pode restringir mais). Quem tem vínculo
    // na PRÓPRIA rede da escola sempre entra.
    const ownNetwork =
      professorContext.linkedSchoolIds.has(item.schoolId) ||
      professorContext.linkedNetworkIds.has(schoolContext.networkId);
    const accepted =
      schoolContext.acceptedNetworkIds &&
      schoolContext.acceptedNetworkIds.length > 0
        ? schoolContext.acceptedNetworkIds.filter((id) =>
            schoolContext.allowedNetworkIds.has(id),
          )
        : [...schoolContext.allowedNetworkIds];
    const externalAllowed = accepted.some(
      (networkId) =>
        professorContext.linkedNetworkIds.has(networkId) ||
        professorContext.interestedNetworkIds.has(networkId),
    );

    if (!ownNetwork && !externalAllowed) {
      return {
        visible: false,
        reason: 'NETWORK',
        message:
          'Esta vaga não está disponível para professores da sua rede/município',
      };
    }

    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    const elapsedMinutes = (now - createdAt) / 60000;

    // Modelo de grupos (criado pela escola).
    if (schoolContext.hasGroups) {
      const group = professorContext.groupBySchoolId.get(item.schoolId);
      const delayMinutes =
        group?.delayMinutes ?? schoolContext.ungroupedDelayMinutes;
      if (elapsedMinutes < delayMinutes) {
        const remaining = Math.ceil(delayMinutes - elapsedMinutes);
        return {
          visible: false,
          reason: 'PRIORITY_WINDOW',
          message: group
            ? `Esta vaga abre para o grupo "${group.name}" em ${remaining} minuto(s)`
            : `Esta vaga abre em ${remaining} minuto(s)`,
        };
      }
      return { visible: true, groupName: group?.name };
    }

    // Fallback retrocompatível: escola sem grupos usa a janela única.
    if (professorContext.linkedSchoolIds.has(item.schoolId)) {
      return { visible: true };
    }
    const windowHours = schoolContext.priorityWindowHours;
    if (windowHours && elapsedMinutes < windowHours * 60) {
      const remaining = Math.ceil(windowHours * 60 - elapsedMinutes);
      return {
        visible: false,
        reason: 'PRIORITY_WINDOW',
        message: `Esta vaga está em janela de prioridade para professores da escola (abre em ${remaining} minuto(s))`,
      };
    }

    return { visible: true };
  }
}
