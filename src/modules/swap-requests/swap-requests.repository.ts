import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SwapRequests, Prisma } from '@prisma/client';

@Injectable()
export class SwapRequestsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.SwapRequestsCreateInput): Promise<SwapRequests> {
    return this.prisma.swapRequests.create({ data });
  }

  async findAll(params: {
    where?: Prisma.SwapRequestsWhereInput;
    orderBy?: Prisma.SwapRequestsOrderByWithRelationInput;
  }): Promise<SwapRequests[]> {
    return this.prisma.swapRequests.findMany(params);
  }

  async findOne(id: number): Promise<SwapRequests | null> {
    return this.prisma.swapRequests.findUnique({ where: { id } });
  }

  async update(
    id: number,
    data: Prisma.SwapRequestsUpdateInput,
  ): Promise<SwapRequests> {
    return this.prisma.swapRequests.update({
      where: { id },
      data,
    });
  }

  async findByClassAndTarget(
    classId: number,
    targetId: number,
    status?: string,
  ): Promise<SwapRequests[]> {
    return this.prisma.swapRequests.findMany({
      where: {
        classId,
        targetId,
        status: status as any,
      },
    });
  }
}
