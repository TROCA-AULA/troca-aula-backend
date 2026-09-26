import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { profiles } from '../../database/schema';

// Profiles não está na lista de soft-delete (nunca teve deletedAt no schema
// Prisma) — remove() aqui é um DELETE real, igual ao comportamento anterior.
@Injectable()
export class ProfileRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createProfileDto: CreateProfileDto) {
    const [profile] = await this.drizzle.db
      .insert(profiles)
      .values({ ...createProfileDto })
      .returning();
    return profile;
  }

  findAll() {
    return this.drizzle.db.select().from(profiles);
  }

  async findOne(id: number) {
    const [profile] = await this.drizzle.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    return profile ?? null;
  }

  async update(id: number, updateProfileDto: UpdateProfileDto) {
    const [profile] = await this.drizzle.db
      .update(profiles)
      .set({ ...updateProfileDto })
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async remove(id: number) {
    const [profile] = await this.drizzle.db
      .delete(profiles)
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }
}
