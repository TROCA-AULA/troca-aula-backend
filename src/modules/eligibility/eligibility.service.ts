import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networkInterconnections,
  professorNetworkInterests,
  professorSchoolExclusions,
  schoolPriorityTiers,
  schools,
} from '../../database/schema';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import {
  EligibilityClassInput,
  EligibilityVerdict,
  isTierScope,
  TierScope,
} from './eligibility.types';

interface ProfessorEligibilityContext {
  linkedSchoolIds: Set<number>;
  linkedNetworkIds: Set<number>;
  excludedSchoolIds: Set<number>;
  interestedNetworkIds: Set<number>;
}

interface SchoolEligibilityContext {
  networkId: number;
  priorityWindowHours: number | null;
  tiers: Array<{
    order: number;
    delayMinutes: number;
    scopeType: TierScope;
    restrictedNetworkIds: number[] | null;
  }>;
  /** Redes que a rede desta escola interconectou (escopo de rede, direcional). */
  allowedNetworkIds: Set<number>;
}

// Fonte única da regra de VISIBILIDADE de vaga para professor (listagem e
// candidatura usam o mesmo motor). Premissas adotadas para as perguntas de
// negócio em aberto da Seção 9.5 do Design Doc (revisáveis sem mudar o
// schema — documentadas no próprio documento):
//   Q1: o nível GERAL é sempre configurável pela escola (a lista de tiers é
//       dela); sem tier GERAL a vaga nunca abre a desconhecidos.
//   Q2: professor sem vínculo/cidade cai naturalmente no primeiro tier que
//       o aceite (na prática, GERAL) — não bloqueia nenhuma ação.
//   Q3: implementado como níveis de ESCOPO (SchoolPriorityTiers), não como
//       ranking individual por seniority (o "mais tempo de casa" continua
//       como informação ao gestor, via schoolSince).
//   Q4: direção da própria escola (DIRETOR/AUXILIAR_ADMIN) + MASTER
//       administram os tiers — sem COORDENADOR_MUNICIPAL neste ciclo.
//   Q5: interconexões são geridas só pelo MASTER neste ciclo.
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

    const [exclusions, interests] = await Promise.all([
      this.drizzle.db.query.professorSchoolExclusions.findMany({
        where: eq(professorSchoolExclusions.professorId, professorId),
      }),
      this.drizzle.db.query.professorNetworkInterests.findMany({
        where: eq(professorNetworkInterests.professorId, professorId),
      }),
    ]);

    const linkedSchools: Array<{ id: number; networkId: number }> =
      linkedSchoolIds.size > 0
        ? await this.drizzle.db.query.schools.findMany({
            where: inArray(schools.id, [...linkedSchoolIds]),
            columns: { id: true, networkId: true },
          })
        : [];

    return {
      linkedSchoolIds,
      linkedNetworkIds: new Set(
        linkedSchools.map((school) => school.networkId),
      ),
      excludedSchoolIds: new Set(exclusions.map((row) => row.schoolId)),
      interestedNetworkIds: new Set(interests.map((row) => row.networkId)),
    };
  }

  private async loadSchoolContexts(
    schoolIds: number[],
  ): Promise<Map<number, SchoolEligibilityContext>> {
    const map = new Map<number, SchoolEligibilityContext>();
    if (schoolIds.length === 0) return map;

    const schoolRows = await this.drizzle.db.query.schools.findMany({
      where: inArray(schools.id, schoolIds),
      columns: { id: true, networkId: true, priorityWindowHours: true },
    });

    const tiers = await this.drizzle.db.query.schoolPriorityTiers.findMany({
      where: inArray(schoolPriorityTiers.schoolId, schoolIds),
      orderBy: (fields, { asc }) => [asc(fields.order)],
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
        priorityWindowHours: row.priorityWindowHours ?? null,
        tiers: tiers
          .filter(
            (tierRow) =>
              tierRow.schoolId === row.id && isTierScope(tierRow.scopeType),
          )
          .map((tierRow) => ({
            order: tierRow.order,
            delayMinutes: tierRow.delayMinutes,
            scopeType: tierRow.scopeType as TierScope,
            restrictedNetworkIds: tierRow.restrictedNetworkIds ?? null,
          }))
          .sort((a, b) => a.order - b.order),
        allowedNetworkIds: allowedByOrigin.get(row.networkId) ?? new Set(),
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
    // Exclusão do próprio professor vence QUALQUER outro critério (Seção
    // 9.3) — e a mensagem diz exatamente isso, para ele saber como desfazer.
    if (professorContext.excludedSchoolIds.has(item.schoolId)) {
      return {
        visible: false,
        reason: 'EXCLUDED',
        message:
          'Você excluiu esta escola das suas vagas — remova a exclusão nas suas preferências para voltar a vê-la',
      };
    }

    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    const elapsedMinutes = (now - createdAt) / 60000;

    // Sem tiers configurados: fallback retrocompatível para o campo único
    // Schools.priorityWindowHours (MVP da Seção 9.2).
    if (!schoolContext || schoolContext.tiers.length === 0) {
      if (professorContext.linkedSchoolIds.has(item.schoolId)) {
        return { visible: true, tierScope: 'ESCOLA' };
      }
      const windowHours = schoolContext?.priorityWindowHours;
      if (windowHours && elapsedMinutes < windowHours * 60) {
        return {
          visible: false,
          reason: 'PRIORITY_WINDOW',
          message:
            'Esta vaga está em janela de prioridade para professores da escola',
        };
      }
      return { visible: true, tierScope: 'GERAL' };
    }

    // Com tiers: o primeiro nível (na ordem configurada) para o qual o
    // professor se qualifica é o que decide — inclusive para dizer que ele
    // precisa esperar o atraso desse nível.
    for (const tier of schoolContext.tiers) {
      if (
        !this.qualifies(
          tier.scopeType,
          tier.restrictedNetworkIds,
          item.schoolId,
          schoolContext,
          professorContext,
        )
      ) {
        continue;
      }
      if (elapsedMinutes < tier.delayMinutes) {
        const remaining = Math.ceil(tier.delayMinutes - elapsedMinutes);
        return {
          visible: false,
          reason: 'PRIORITY_WINDOW',
          message: `Esta vaga abre para o seu nível de prioridade em ${remaining} minuto(s)`,
        };
      }
      return { visible: true, tierScope: tier.scopeType };
    }

    return {
      visible: false,
      reason: 'PRIORITY_WINDOW',
      message:
        'Esta vaga ainda não está disponível para o seu vínculo com esta rede/escola',
    };
  }

  private qualifies(
    scope: TierScope,
    restrictedNetworkIds: number[] | null,
    schoolId: number,
    schoolContext: SchoolEligibilityContext,
    professorContext: ProfessorEligibilityContext,
  ): boolean {
    switch (scope) {
      case 'ESCOLA':
        return professorContext.linkedSchoolIds.has(schoolId);
      case 'REDE':
        return professorContext.linkedNetworkIds.has(schoolContext.networkId);
      case 'REDE_INTERCONECTADA_INTERESSADA': {
        // "O mais restritivo vence" (Seção 9.4): a escola só pode escolher
        // dentre as redes que a PRÓPRIA rede interconectou (direcional).
        let allowed = [...schoolContext.allowedNetworkIds];
        if (restrictedNetworkIds && restrictedNetworkIds.length > 0) {
          allowed = allowed.filter((id) => restrictedNetworkIds.includes(id));
        }
        return allowed.some(
          (networkId) =>
            professorContext.linkedNetworkIds.has(networkId) ||
            professorContext.interestedNetworkIds.has(networkId),
        );
      }
      case 'GERAL':
        return true;
      default:
        return false;
    }
  }
}
