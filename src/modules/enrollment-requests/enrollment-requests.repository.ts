import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EnrollmentRequest, Prisma } from '@prisma/client';

@Injectable()
export class EnrollmentRequestsRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.EnrollmentRequestCreateInput,
  ): Promise<EnrollmentRequest> {
    return this.prisma.enrollmentRequest.create({ data });
  }

  async findAll(params: {
    where?: Prisma.EnrollmentRequestWhereInput;
    orderBy?: Prisma.EnrollmentRequestOrderByWithRelationInput;
  }): Promise<EnrollmentRequest[]> {
    return this.prisma.enrollmentRequest.findMany(params);
  }

  async findOne(id: number): Promise<EnrollmentRequest | null> {
    return this.prisma.enrollmentRequest.findUnique({ where: { id } });
  }

  async update(
    id: number,
    data: Prisma.EnrollmentRequestUpdateInput,
  ): Promise<EnrollmentRequest> {
    return this.prisma.enrollmentRequest.update({
      where: { id },
      data,
    });
  }

  async findByClassAndProfessor(
    classId: number,
    professorId: number,
    status?: string,
  ): Promise<EnrollmentRequest[]> {
    return this.prisma.enrollmentRequest.findMany({
      where: {
        classId,
        professorId,
        status: status as any,
      },
    });
  }
}
