import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { subjects } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';

@Injectable()
export class SubjectRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createSubjectDto: CreateSubjectDto) {
    const [subject] = await this.drizzle.db
      .insert(subjects)
      .values({ ...createSubjectDto })
      .returning();
    return subject;
  }

  findAll() {
    return this.drizzle.db
      .select()
      .from(subjects)
      .where(notDeleted(subjects));
  }

  async findOne(id: number) {
    const [subject] = await this.drizzle.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, id), notDeleted(subjects)));
    return subject ?? null;
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto) {
    const [subject] = await this.drizzle.db
      .update(subjects)
      .set({ ...updateSubjectDto })
      .where(eq(subjects.id, id))
      .returning();
    return subject;
  }

  // Prisma reescrevia delete -> update(deletedAt: now()) via middleware (ver
  // src/prisma.service.ts, histórico). Aqui isso é explícito.
  async remove(id: number) {
    const [subject] = await this.drizzle.db
      .update(subjects)
      .set({ deletedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();
    return subject;
  }
}
