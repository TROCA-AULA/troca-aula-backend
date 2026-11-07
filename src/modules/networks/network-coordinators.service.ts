import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { networks, userNetworkLinks, users } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';

// Vínculo coordenador <-> rede (COORDENADOR_MUNICIPAL). Só o MASTER chega
// aqui (RolesGuard no controller); o vínculo nasce aprovado por ele.
@Injectable()
export class NetworkCoordinatorsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    const rows = await this.drizzle.db.query.userNetworkLinks.findMany({
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true } },
        network: { columns: { id: true, name: true } },
      },
    });
    return rows
      .filter((row) => row.user)
      .map((row) => ({
        userId: row.userId,
        userName: row.user?.name ?? null,
        userEmail: row.user?.email ?? null,
        userPhone: row.user?.phone ?? null,
        networkId: row.networkId,
        networkName: row.network?.name ?? null,
        approvedAt: row.approvedAt,
      }));
  }

  async create(userId: number, networkId: number, masterId: number) {
    const [user, network] = await Promise.all([
      this.drizzle.db.query.users.findFirst({
        where: and(eq(users.id, userId), notDeleted(users)),
        columns: { id: true },
      }),
      this.drizzle.db.query.networks.findFirst({
        where: eq(networks.id, networkId),
        columns: { id: true },
      }),
    ]);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!network) throw new NotFoundException('Rede não encontrada');

    const [link] = await this.drizzle.db
      .insert(userNetworkLinks)
      .values({
        userId,
        networkId,
        approvedAt: new Date(),
        approvedById: masterId,
      })
      .onConflictDoNothing()
      .returning();
    if (!link) {
      throw new BadRequestException('Este usuário já é coordenador desta rede');
    }
    return link;
  }

  async remove(userId: number, networkId: number) {
    const [link] = await this.drizzle.db
      .delete(userNetworkLinks)
      .where(
        and(
          eq(userNetworkLinks.userId, userId),
          eq(userNetworkLinks.networkId, networkId),
        ),
      )
      .returning();
    if (!link) {
      throw new NotFoundException('Vínculo de coordenação não encontrado');
    }
    return link;
  }
}
