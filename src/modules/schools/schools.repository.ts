import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { schools } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';

@Injectable()
export class SchoolsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createSchoolDto: CreateSchoolDto) {
    const [school] = await this.drizzle.db
      .insert(schools)
      .values({ ...createSchoolDto })
      .returning();
    return school;
  }

  findAll() {
    return this.drizzle.db.select().from(schools).where(notDeleted(schools));
  }

  async findOne(id: number) {
    const [school] = await this.drizzle.db
      .select()
      .from(schools)
      .where(and(eq(schools.id, id), notDeleted(schools)));
    return school ?? null;
  }

  async update(id: number, updateSchoolDto: UpdateSchoolDto) {
    const [school] = await this.drizzle.db
      .update(schools)
      .set({ ...updateSchoolDto })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async updatePriorityWindow(id: number, priorityWindowHours: number | null) {
    const [school] = await this.drizzle.db
      .update(schools)
      .set({ priorityWindowHours })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async remove(id: number) {
    const [school] = await this.drizzle.db
      .update(schools)
      .set({ deletedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }
}
