import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { users, usersProfilesSchools } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';

export interface FindAllUsersFilter {
  schoolId?: number;
  profileId?: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createUserDto: CreateUserDto) {
    const [user] = await this.drizzle.db
      .insert(users)
      .values({ ...createUserDto })
      .returning();
    return user;
  }

  // O próprio ato de chamar assign-profile já passou pelo TenantGuard +
  // RolesGuard (só MASTER/DIRETOR/AUXILIAR_ADMIN daquela escola chegam
  // aqui) — então o vínculo nasce aprovado, com approvedById = quem
  // aprovou. Antes desta correção, approvedAt nunca era setado e o
  // TenantContextService (que só considera approvedAt != null) descartava
  // todo vínculo recém-criado — assign-profile não concedia acesso nenhum.
  async assignProfile(
    userId: number,
    profileId: number,
    schoolId: number,
    approvedById: number,
  ) {
    const [link] = await this.drizzle.db
      .insert(usersProfilesSchools)
      .values({
        userId,
        profileId,
        schoolId,
        approvedAt: new Date(),
        approvedById,
      })
      .onConflictDoUpdate({
        target: [
          usersProfilesSchools.userId,
          usersProfilesSchools.profileId,
          usersProfilesSchools.schoolId,
        ],
        set: { approvedAt: new Date(), approvedById },
      })
      .returning();
    return link;
  }

  async unassignProfile(userId: number, profileId: number, schoolId: number) {
    const [link] = await this.drizzle.db
      .delete(usersProfilesSchools)
      .where(
        and(
          eq(usersProfilesSchools.userId, userId),
          eq(usersProfilesSchools.profileId, profileId),
          eq(usersProfilesSchools.schoolId, schoolId),
        ),
      )
      .returning();
    return link ?? null;
  }

  async findAll(filter: FindAllUsersFilter = {}) {
    if (filter.schoolId === undefined && filter.profileId === undefined) {
      return this.drizzle.db.query.users.findMany({
        where: notDeleted(users),
        with: { upsUser: { with: { profile: true } } },
      });
    }

    // Filtro real por escola/perfil: resolve primeiro os userIds vinculados
    // (via UsersProfilesSchools) e depois busca os usuários — evita duplicar
    // linha por vínculo, que aconteceria com um JOIN direto quando o usuário
    // tem mais de um vínculo.
    const linkConditions = [
      filter.schoolId !== undefined
        ? eq(usersProfilesSchools.schoolId, filter.schoolId)
        : undefined,
      filter.profileId !== undefined
        ? eq(usersProfilesSchools.profileId, filter.profileId)
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const links = await this.drizzle.db.query.usersProfilesSchools.findMany({
      where: and(...linkConditions),
      columns: { userId: true },
    });
    const userIds = [...new Set(links.map((l) => l.userId))];
    if (userIds.length === 0) return [];

    return this.drizzle.db.query.users.findMany({
      where: and(inArray(users.id, userIds), notDeleted(users)),
      with: { upsUser: { with: { profile: true } } },
    });
  }

  findOne(id: number) {
    return this.drizzle.db.query.users.findFirst({
      where: and(eq(users.id, id), notDeleted(users)),
      with: { upsUser: true },
    });
  }

  findOneBy(email: string) {
    return this.drizzle.db.query.users.findFirst({
      where: and(eq(users.email, email), notDeleted(users)),
      with: {
        upsUser: {
          // `networkId` da escola de cada vínculo entra no JWT (ver
          // AuthService.signIn) para o frontend operar por rede sem uma
          // segunda chamada — só a coluna, não a escola inteira.
          with: { school: { columns: { networkId: true } } },
        },
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const [user] = await this.drizzle.db
      .update(users)
      .set({ ...updateUserDto })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async remove(id: number) {
    const [user] = await this.drizzle.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}
