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
  users,
} from '../../database/schema';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EligibilityClassInput, EligibilityVerdict } from './eligibility.types';

interface ProfessorEligibilityContext {
  linkedSchoolIds: Set<number>;
  linkedNetworkIds: Set<number>;
  excludedSchoolIds: Set<number>;
  interestedNetworkIds: Set<number>;
  /** Grupo de maior prioridade (menor número) do professor em cada escola. */
  groupBySchoolId: Map<
    number,
    { name: string; priority: number; delayMinutes: number }
  >;
}

interface SchoolEligibilityContext {
  networkId: number;
  ungroupedDelayMinutes: number;
  hasGroups: boolean;
  /** Maior tempo de espera entre os grupos da escola (o "último grupo"). */
  maxGroupDelayMinutes: number;
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
//   - a escola cria grupos de prioridade (0 = recebe primeiro, 1, 2...),
//     cada um com o seu tempo de espera a partir da criação da vaga; quem
//     está num grupo vê a vaga quando o tempo DO SEU grupo passa;
//   - escola SEM nenhum grupo: todo professor (que passou na regra de
//     rede) vê a vaga na hora;
//   - escola COM grupos: quem não está em grupo nenhum é o ÚLTIMO a
//     receber — só depois do tempo do grupo mais demorado (ou do
//     ungroupedDelayMinutes da escola, se ele for ainda maior);
//   - exclusão do próprio professor vence qualquer critério.
// (Schools.priorityWindowHours, a janela única antiga, não é mais usada.)
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

    // "Contrato prevalece sobre residência" (Design Doc, 9.3): sem vínculo
    // aprovado em nenhuma escola, o município onde o professor mora conta
    // como se fosse o dele para a regra do município.
    if (tenant.links.length === 0) {
      const [row] = await this.drizzle.db
        .select({ residenceNetworkId: users.residenceNetworkId })
        .from(users)
        .where(eq(users.id, professorId));
      if (row?.residenceNetworkId != null) {
        linkedNetworkIds.add(row.residenceNetworkId);
      }
    }

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
              priority: true,
              delayMinutes: true,
            },
          },
        },
      }),
    ]);

    const groupBySchoolId: ProfessorEligibilityContext['groupBySchoolId'] =
      new Map();
    for (const membership of memberships) {
      const group = membership.group;
      if (!group) continue;
      const current = groupBySchoolId.get(group.schoolId);
      const isBetter =
        !current ||
        group.priority < current.priority ||
        (group.priority === current.priority &&
          group.delayMinutes < current.delayMinutes);
      if (isBetter) {
        groupBySchoolId.set(group.schoolId, {
          name: group.name,
          priority: group.priority,
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

  // Leitura privilegiada (defeito D4): a escola da vaga pode ser de OUTRO
  // município — justamente o caso da interconexão —, e o RLS escondia essa
  // linha. Antes, "escola não encontrada" virava "vaga visível".
  private loadSchoolContexts(
    schoolIds: number[],
  ): Promise<Map<number, SchoolEligibilityContext>> {
    return this.drizzle.runPrivileged(() =>
      this.loadSchoolContextsUnscoped(schoolIds),
    );
  }

  private async loadSchoolContextsUnscoped(
    schoolIds: number[],
  ): Promise<Map<number, SchoolEligibilityContext>> {
    const map = new Map<number, SchoolEligibilityContext>();
    if (schoolIds.length === 0) return map;

    const schoolRows = await this.drizzle.db.query.schools.findMany({
      where: inArray(schools.id, schoolIds),
      columns: {
        id: true,
        networkId: true,
        ungroupedDelayMinutes: true,
        acceptedNetworkIds: true,
      },
    });

    const groups = await this.drizzle.db.query.schoolTeacherGroups.findMany({
      where: inArray(schoolTeacherGroups.schoolId, schoolIds),
      columns: { id: true, schoolId: true, delayMinutes: true },
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
      const schoolGroups = groups.filter((group) => group.schoolId === row.id);
      map.set(row.id, {
        networkId: row.networkId,
        ungroupedDelayMinutes: row.ungroupedDelayMinutes ?? 0,
        hasGroups: schoolGroups.length > 0,
        maxGroupDelayMinutes: Math.max(
          0,
          ...schoolGroups.map((group) => group.delayMinutes),
        ),
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

    // Falha FECHADA (defeito D4): sem conseguir ler a escola, não há como
    // aplicar a regra — então a vaga não aparece.
    if (!schoolContext) {
      return {
        visible: false,
        reason: 'NETWORK',
        message: 'Esta vaga não está disponível para você',
      };
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

    // Escola sem grupos de prioridade: todos recebem na hora.
    if (!schoolContext.hasGroups) {
      return { visible: true };
    }

    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    const elapsedMinutes = (now - createdAt) / 60000;
    const group = professorContext.groupBySchoolId.get(item.schoolId);

    // Sem grupo numa escola que tem grupos = último a receber.
    const delayMinutes = group
      ? group.delayMinutes
      : Math.max(
          schoolContext.maxGroupDelayMinutes,
          schoolContext.ungroupedDelayMinutes,
        );

    if (elapsedMinutes < delayMinutes) {
      const remaining = Math.ceil(delayMinutes - elapsedMinutes);
      return {
        visible: false,
        reason: 'PRIORITY_WINDOW',
        message: group
          ? `Esta vaga abre para o seu grupo "${group.name}" (prioridade ${group.priority}) em ${remaining} minuto(s)`
          : `Esta vaga abre para professores sem grupo em ${remaining} minuto(s), depois de todos os grupos de prioridade da escola`,
      };
    }
    return { visible: true, groupName: group?.name };
  }
}
