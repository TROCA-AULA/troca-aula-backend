import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { networks } from '../../database/schema';

// Networks não tem soft delete — nenhuma regra de "desativar uma rede
// inteira" foi levantada ainda (ver comentário em src/database/schema.ts).
@Injectable()
export class NetworksRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createNetworkDto: CreateNetworkDto) {
    const [network] = await this.drizzle.db
      .insert(networks)
      .values({ ...createNetworkDto })
      .returning();
    return network;
  }

  findAll() {
    return this.drizzle.db.select().from(networks);
  }

  async findOne(id: number) {
    const [network] = await this.drizzle.db
      .select()
      .from(networks)
      .where(eq(networks.id, id));
    return network ?? null;
  }

  async update(id: number, updateNetworkDto: UpdateNetworkDto) {
    const [network] = await this.drizzle.db
      .update(networks)
      .set({ ...updateNetworkDto })
      .where(eq(networks.id, id))
      .returning();
    return network;
  }
}
