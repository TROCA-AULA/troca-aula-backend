import { Injectable } from '@nestjs/common';
import { and, count, eq, isNull, or } from 'drizzle-orm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { classes, usersProfilesSchools } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';
import { GetClassDto } from './dto/get-class.dto';
import { GetCoverageStatsDto } from './dto/get-coverage-stats.dto';

@Injectable()
export class ClassesRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createClassDto: CreateClassDto) {
    const [created] = await this.drizzle.db
      .insert(classes)
      .values({
        schoolId: createClassDto.schoolId,
        subjectId: createClassDto.subjectId,
        createdByd: createClassDto.createdByd,
        statededAt: createClassDto.statededAt,
        finishedAt: createClassDto.finishedAt,
      })
      .returning();
    return created;
  }

  // Middleware do PrismaService (histórico) adicionava `deletedAt: null` a
  // TODO findMany de Classes, mesmo quando nenhum outro filtro era passado —
  // por isso notDeleted(classes) entra incondicionalmente aqui, não só
  // dentro do `if`.
  findAll(params: GetClassDto) {
    const conditions = [notDeleted(classes)];

    if (params?.userId) {
      conditions.push(
        or(
          isNull(classes.registredById),
          eq(classes.registredById, params.userId),
        )!,
      );
    }
    if (params?.schoolId) {
      conditions.push(eq(classes.schoolId, params.schoolId));
    }
    if (params?.available !== undefined) {
      conditions.push(eq(classes.available, params.available));
    }

    return this.drizzle.db.query.classes.findMany({
      where: and(...conditions),
      with: {
        school: true,
        subject: true,
        createdBy: {
          with: {
            upsUser: {
              with: { profile: true },
            },
          },
        },
        approvedBy: true,
        registredBy: true,
        profile: true,
      },
      orderBy: (fields, { desc }) => [desc(fields.statededAt)],
    });
  }

  // Inclui `school` (priorityWindowHours) porque
  // EnrollmentRequestsService.create() precisa validar a janela de
  // prioridade da escola ao aceitar uma candidatura - os demais usos deste
  // método (update/remove) ignoram o campo extra sem custo real.
  findOne(id: number) {
    return this.drizzle.db.query.classes.findFirst({
      where: and(eq(classes.id, id), notDeleted(classes)),
      with: { school: true },
    });
  }

  async update(id: number, updateClassDto: UpdateClassDto) {
    const updateData: Partial<typeof classes.$inferInsert> = {};

    if (updateClassDto.approvedById) {
      const clas = await this.findOne(id);
      const [link] = await this.drizzle.db
        .select()
        .from(usersProfilesSchools)
        .where(
          and(
            eq(usersProfilesSchools.userId, updateClassDto.approvedById),
            eq(usersProfilesSchools.schoolId, clas?.schoolId as number),
          ),
        )
        .limit(1);

      updateData.approvedById = updateClassDto.approvedById;
      updateData.profileId = link?.profileId;
      updateData.approvedAt = new Date();
    }

    if (updateClassDto.registredById) {
      updateData.registredById = updateClassDto.registredById;
    }

    const [updated] = await this.drizzle.db
      .update(classes)
      .set(updateData)
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async remove(id: number) {
    const [removed] = await this.drizzle.db
      .update(classes)
      .set({ deletedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return removed;
  }

  // Fase 4 (COULD) — agregação simples sobre Classes já existente, sem
  // tabela/pipeline novo. "Coberta" = available=false (setado por
  // EnrollmentRequestsService.approve()); "vaga" = qualquer linha de
  // Classes no recorte (cada linha já representa uma aula sem titular).
  async getCoverageCounts(params: GetCoverageStatsDto) {
    const conditions = [notDeleted(classes)];
    if (params.schoolId !== undefined) {
      conditions.push(eq(classes.schoolId, params.schoolId));
    }
    if (params.subjectId !== undefined) {
      conditions.push(eq(classes.subjectId, params.subjectId));
    }
    if (params.dayOfWeek !== undefined) {
      conditions.push(eq(classes.dayOfWeek, params.dayOfWeek));
    }

    const [totalRow] = await this.drizzle.db
      .select({ value: count() })
      .from(classes)
      .where(and(...conditions));

    const [coveredRow] = await this.drizzle.db
      .select({ value: count() })
      .from(classes)
      .where(and(...conditions, eq(classes.available, false)));

    return {
      totalVagas: totalRow?.value ?? 0,
      cobertas: coveredRow?.value ?? 0,
    };
  }
}
