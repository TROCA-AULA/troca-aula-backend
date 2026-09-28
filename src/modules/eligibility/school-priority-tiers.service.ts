import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  networkInterconnections,
  networks,
  schoolPriorityTiers,
  schools,
} from '../../database/schema';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { SetPriorityTiersDto } from './dto/set-priority-tiers.dto';
import { SetNetworkInterconnectionsDto } from './dto/preferences.dto';

@Injectable()
export class SchoolPriorityTiersService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async get(schoolId: number, requesterId: number) {
    await this.assertManagerOfSchool(schoolId, requesterId);

    const school = await this.drizzle.db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: { id: true, networkId: true, priorityWindowHours: true },
    });
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    const [tiers, interconnections] = await Promise.all([
      this.drizzle.db.query.schoolPriorityTiers.findMany({
        where: eq(schoolPriorityTiers.schoolId, schoolId),
        orderBy: [asc(schoolPriorityTiers.order)],
      }),
      this.drizzle.db.query.networkInterconnections.findMany({
        where: eq(networkInterconnections.originNetworkId, school.networkId),
      }),
    ]);

    return {
      schoolId,
      // Fallback retrocompatível quando não há tiers configurados.
      fallbackPriorityWindowHours: school.priorityWindowHours ?? null,
      // Redes que a rede desta escola interconectou (limite do "mais
      // restritivo vence": a escola só pode escolher dentre estas).
      allowedNetworkIds: interconnections.map((row) => row.allowedNetworkId),
      tiers: tiers.map((tier) => ({
        order: tier.order,
        delayMinutes: tier.delayMinutes,
        scopeType: tier.scopeType,
        restrictedNetworkIds: tier.restrictedNetworkIds ?? null,
      })),
    };
  }

  async replace(
    schoolId: number,
    dto: SetPriorityTiersDto,
    requesterId: number,
  ) {
    await this.assertManagerOfSchool(schoolId, requesterId);

    const school = await this.drizzle.db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: { id: true, networkId: true },
    });
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    const orders = dto.tiers.map((tier) => tier.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('Há níveis com a mesma ordem');
    }

    const interconnections =
      await this.drizzle.db.query.networkInterconnections.findMany({
        where: eq(networkInterconnections.originNetworkId, school.networkId),
      });
    const allowedNetworkIds = new Set(
      interconnections.map((row) => row.allowedNetworkId),
    );

    for (const tier of dto.tiers) {
      if (
        tier.scopeType === 'REDE_INTERCONECTADA_INTERESSADA' &&
        tier.restrictedNetworkIds &&
        tier.restrictedNetworkIds.length > 0
      ) {
        const outside = tier.restrictedNetworkIds.filter(
          (networkId) => !allowedNetworkIds.has(networkId),
        );
        if (outside.length > 0) {
          throw new BadRequestException(
            'O nível de rede interconectada só pode restringir a redes que a própria rede da escola interconectou (o mais restritivo vence)',
          );
        }
      }
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .delete(schoolPriorityTiers)
        .where(eq(schoolPriorityTiers.schoolId, schoolId));

      if (dto.tiers.length > 0) {
        await tx.insert(schoolPriorityTiers).values(
          dto.tiers.map((tier) => ({
            schoolId,
            order: tier.order,
            delayMinutes: tier.delayMinutes,
            scopeType: tier.scopeType,
            restrictedNetworkIds: tier.restrictedNetworkIds ?? null,
          })),
        );
      }
    });

    return this.get(schoolId, requesterId);
  }

  private async assertManagerOfSchool(schoolId: number, requesterId: number) {
    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode configurar a prioridade de vagas da sua escola',
      );
    }
  }
}

@Injectable()
export class NetworkInterconnectionsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async get(networkId: number) {
    await this.assertNetworkExists(networkId);
    const rows = await this.drizzle.db.query.networkInterconnections.findMany({
      where: eq(networkInterconnections.originNetworkId, networkId),
      with: { allowedNetwork: { columns: { id: true, name: true } } },
    });
    return {
      networkId,
      interconnections: rows.map((row) => ({
        networkId: row.allowedNetworkId,
        networkName: row.allowedNetwork?.name ?? null,
      })),
    };
  }

  async replace(networkId: number, dto: SetNetworkInterconnectionsDto) {
    await this.assertNetworkExists(networkId);

    const unique = [...new Set(dto.allowedNetworkIds)];
    if (unique.includes(networkId)) {
      throw new BadRequestException(
        'Uma rede não pode se interconectar com ela mesma',
      );
    }

    if (unique.length > 0) {
      const existing = await this.drizzle.db.query.networks.findMany({
        where: inArray(networks.id, unique),
        columns: { id: true },
      });
      if (existing.length !== unique.length) {
        throw new NotFoundException('Uma ou mais redes informadas não existem');
      }
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .delete(networkInterconnections)
        .where(eq(networkInterconnections.originNetworkId, networkId));

      if (unique.length > 0) {
        await tx.insert(networkInterconnections).values(
          unique.map((allowedNetworkId) => ({
            originNetworkId: networkId,
            allowedNetworkId,
          })),
        );
      }
    });

    return this.get(networkId);
  }

  private async assertNetworkExists(networkId: number) {
    const network = await this.drizzle.db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      columns: { id: true },
    });
    if (!network) {
      throw new NotFoundException('Rede não encontrada');
    }
  }
}
