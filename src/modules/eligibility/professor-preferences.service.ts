import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networks,
  professorNetworkInterests,
  professorSchoolExclusions,
  schools,
  users,
  usersProfilesSchools,
} from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';

// Preferências do professor usadas pelo motor de elegibilidade (Fase 5):
// interesse POSITIVO por redes e exclusão NEGATIVA de escolas.
//
// Defeito D5: as redes/escolas de OUTROS municípios ficavam invisíveis
// pelo RLS — o professor só conseguia declarar interesse no próprio
// município, e os nomes vinham null. As leituras de diretório (id e nome)
// abaixo rodam em modo privilegiado.
@Injectable()
export class ProfessorPreferencesService {
  constructor(private readonly drizzle: DrizzleService) {}

  // Catálogo para as telas de preferência: todas as redes e escolas, só
  // com id, nome e rede.
  options() {
    return this.drizzle.runPrivileged(async () => {
      const [networkRows, schoolRows] = await Promise.all([
        this.drizzle.db.query.networks.findMany({
          columns: { id: true, name: true },
          orderBy: [asc(networks.name)],
        }),
        this.drizzle.db.query.schools.findMany({
          where: notDeleted(schools),
          columns: { id: true, name: true, networkId: true },
          orderBy: [asc(schools.name)],
        }),
      ]);
      return { networks: networkRows, schools: schoolRows };
    });
  }

  getMine(professorId: number) {
    return this.drizzle.runPrivileged(() => this.getMineUnscoped(professorId));
  }

  private async getMineUnscoped(professorId: number) {
    const [interests, exclusions, user, contract] = await Promise.all([
      this.drizzle.db.query.professorNetworkInterests.findMany({
        where: eq(professorNetworkInterests.professorId, professorId),
        with: { network: { columns: { id: true, name: true } } },
      }),
      this.drizzle.db.query.professorSchoolExclusions.findMany({
        where: eq(professorSchoolExclusions.professorId, professorId),
        with: { school: { columns: { id: true, name: true } } },
      }),
      this.drizzle.db.query.users.findFirst({
        where: eq(users.id, professorId),
        columns: { residenceNetworkId: true },
      }),
      // Algum vínculo aprovado em escola = tem contrato.
      this.drizzle.db.query.usersProfilesSchools.findFirst({
        where: and(
          eq(usersProfilesSchools.userId, professorId),
          isNotNull(usersProfilesSchools.approvedAt),
        ),
        columns: { userId: true },
      }),
    ]);

    const residenceNetworkId = user?.residenceNetworkId ?? null;
    const residenceNetwork =
      residenceNetworkId != null
        ? await this.drizzle.db.query.networks.findFirst({
            where: eq(networks.id, residenceNetworkId),
            columns: { id: true, name: true },
          })
        : null;

    return {
      networkInterests: interests.map((row) => ({
        networkId: row.networkId,
        networkName: row.network?.name ?? null,
      })),
      schoolExclusions: exclusions.map((row) => ({
        schoolId: row.schoolId,
        schoolName: row.school?.name ?? null,
      })),
      // Município onde mora: só vale enquanto não houver contrato.
      residenceNetworkId,
      residenceNetworkName: residenceNetwork?.name ?? null,
      hasContract: Boolean(contract),
    };
  }

  async addNetworkInterest(professorId: number, networkId: number) {
    const network = await this.drizzle.runPrivileged(() =>
      this.drizzle.db.query.networks.findFirst({
        where: eq(networks.id, networkId),
        columns: { id: true },
      }),
    );
    if (!network) {
      throw new NotFoundException('Rede não encontrada');
    }

    await this.drizzle.db
      .insert(professorNetworkInterests)
      .values({ professorId, networkId })
      .onConflictDoNothing();

    return { networkId };
  }

  async removeNetworkInterest(professorId: number, networkId: number) {
    await this.drizzle.db
      .delete(professorNetworkInterests)
      .where(
        and(
          eq(professorNetworkInterests.professorId, professorId),
          eq(professorNetworkInterests.networkId, networkId),
        ),
      );
    return { networkId };
  }

  async addSchoolExclusion(professorId: number, schoolId: number) {
    const school = await this.drizzle.runPrivileged(() =>
      this.drizzle.db.query.schools.findFirst({
        where: and(eq(schools.id, schoolId), notDeleted(schools)),
        columns: { id: true },
      }),
    );
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    await this.drizzle.db
      .insert(professorSchoolExclusions)
      .values({ professorId, schoolId })
      .onConflictDoNothing();

    return { schoolId };
  }

  async removeSchoolExclusion(professorId: number, schoolId: number) {
    await this.drizzle.db
      .delete(professorSchoolExclusions)
      .where(
        and(
          eq(professorSchoolExclusions.professorId, professorId),
          eq(professorSchoolExclusions.schoolId, schoolId),
        ),
      );
    return { schoolId };
  }
}
