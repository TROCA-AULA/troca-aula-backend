import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networks,
  professorNetworkInterests,
  professorSchoolExclusions,
  schools,
} from '../../database/schema';

// Preferências do professor usadas pelo motor de elegibilidade (Fase 5):
// interesse POSITIVO por redes e exclusão NEGATIVA de escolas.
@Injectable()
export class ProfessorPreferencesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getMine(professorId: number) {
    const [interests, exclusions] = await Promise.all([
      this.drizzle.db.query.professorNetworkInterests.findMany({
        where: eq(professorNetworkInterests.professorId, professorId),
        with: { network: { columns: { id: true, name: true } } },
      }),
      this.drizzle.db.query.professorSchoolExclusions.findMany({
        where: eq(professorSchoolExclusions.professorId, professorId),
        with: { school: { columns: { id: true, name: true } } },
      }),
    ]);

    return {
      networkInterests: interests.map((row) => ({
        networkId: row.networkId,
        networkName: row.network?.name ?? null,
      })),
      schoolExclusions: exclusions.map((row) => ({
        schoolId: row.schoolId,
        schoolName: row.school?.name ?? null,
      })),
    };
  }

  async addNetworkInterest(professorId: number, networkId: number) {
    const network = await this.drizzle.db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      columns: { id: true },
    });
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
    const school = await this.drizzle.db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: { id: true },
    });
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
