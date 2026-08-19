import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { FilterEnrollmentRequestDto } from './dto/filter-enrollment-request.dto';
import { ClassesRepository } from '../classes/classes.repository';

@Injectable()
export class EnrollmentRequestsService {
  constructor(
    private readonly repository: EnrollmentRequestsRepository,
    private readonly userRepository: UsersRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly prisma: PrismaService,
  ) {}

  private getPrimaryRoleName(userWithProfile: {
    upsUser?: Array<{ profile?: { name?: string | null } }>;
  }): string {
    return userWithProfile?.upsUser?.[0]?.profile?.name ?? '';
  }

  private isManagerRole(roleName: string): boolean {
    return ['MASTER', 'DIRETOR', 'AUXILIAR_ADMIN'].includes(roleName);
  }

  async create(classId: number, professorId: number) {
    const classData = await this.classesRepository.findOne(classId);
    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (!classData.available) {
      throw new BadRequestException('Aula não está disponível');
    }

    const existingRequest = await this.prisma.enrollmentRequest.findFirst({
      where: {
        classId,
        professorId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Já existe uma solicitação pendente');
    }

    const professor = await this.userRepository.findOne(professorId);
    if (!professor) {
      throw new NotFoundException('Professor não encontrado');
    }

    if (professor.subjectId !== classData.subjectId) {
      throw new ForbiddenException(
        'Você só pode se candidatar a aulas da sua matéria',
      );
    }

    const hasConflict = await this.checkConflict(
      professorId,
      classData.dayOfWeek,
      classData.startTime,
      classData.endTime,
    );

    if (hasConflict) {
      throw new BadRequestException('Conflito de horário detectado');
    }

    if (
      professor.substitutionLimitPerSemester !== null &&
      professor.substitutionLimitPerSemester !== undefined &&
      professor.substitutionLimitPerSemester > 0
    ) {
      const approvedCount = await this.countApprovedSubstitutions(professorId);
      if (approvedCount >= professor.substitutionLimitPerSemester) {
        throw new BadRequestException(
          `Limite de substituições atingido para este semestre (${professor.substitutionLimitPerSemester} limite)`,
        );
      }
    }

    return this.repository.create({
      class: { connect: { id: classId } },
      professor: { connect: { id: professorId } },
      status: 'PENDING',
    });
  }

  private async countApprovedSubstitutions(
    professorId: number,
  ): Promise<number> {
    const count = await this.prisma.enrollmentRequest.count({
      where: {
        professorId,
        status: 'APPROVED',
      },
    });
    return count;
  }

  private async checkConflict(
    professorId: number,
    dayOfWeek: number | null,
    startTime: string | null,
    endTime: string | null,
  ): Promise<boolean> {
    if (!dayOfWeek || !startTime || !endTime) {
      return false;
    }

    const professorClasses = await this.prisma.classes.findMany({
      where: {
        OR: [{ enrolledById: professorId }, { createdByd: professorId }],
        dayOfWeek: dayOfWeek,
        deletedAt: null,
      },
    });

    for (const cls of professorClasses) {
      if (cls.startTime && cls.endTime) {
        if (this.timesOverlap(startTime, endTime, cls.startTime, cls.endTime)) {
          return true;
        }
      }
    }

    return false;
  }

  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  async findAll(params: FilterEnrollmentRequestDto, userId: number) {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const userWithProfile = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        upsUser: {
          include: { profile: true, school: true },
        },
      },
    });

    const roleName = this.getPrimaryRoleName(userWithProfile ?? {});
    const isManager = this.isManagerRole(roleName);
    const managerSchoolId = userWithProfile?.upsUser?.[0]?.schoolId;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.classId) {
      where.classId = params.classId;
    }

    if (params.professorId) {
      where.professorId = params.professorId;
    }

    if (params.userId) {
      where.professorId = params.userId;
    }

    if (params.createdAfter || params.createdBefore || params.mes) {
      where.createdAt = {};
      if (params.createdAfter) {
        where.createdAt.gte = new Date(params.createdAfter);
      }
      if (params.createdBefore) {
        where.createdAt.lte = new Date(params.createdBefore);
      }
      if (params.mes) {
        const start = new Date(`${params.mes}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        where.createdAt.gte = start;
        where.createdAt.lt = end;
      }
    }

    if (params.schoolId) {
      where.class = { schoolId: params.schoolId };
    }

    if (!isManager) {
      where.professorId = userId;
    } else if (roleName !== 'MASTER' && managerSchoolId) {
      where.class = { schoolId: managerSchoolId };
    }

    return this.repository.findAll({ where });
  }

  async findOne(id: number) {
    const request = await this.repository.findOne(id);
    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    return request;
  }

  async approve(id: number, directorId: number) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    const director = await this.prisma.users.findUnique({
      where: { id: directorId },
      include: {
        upsUser: {
          include: { school: true, profile: true },
        },
      },
    });

    if (!director) {
      throw new NotFoundException('Diretor não encontrado');
    }

    const roleName = this.getPrimaryRoleName(director);
    if (!this.isManagerRole(roleName)) {
      throw new ForbiddenException('Apenas gestor pode aprovar solicitações');
    }

    const classData = await this.prisma.classes.findUnique({
      where: { id: request.classId },
      include: { school: true },
    });

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const directorSchoolId = director.upsUser[0]?.schoolId;
    if (roleName !== 'MASTER' && directorSchoolId !== classData.schoolId) {
      throw new ForbiddenException(
        'Você só pode aprovar solicitações de aulas da sua escola',
      );
    }

    await this.prisma.classes.update({
      where: { id: request.classId },
      data: {
        enrolledById: request.professorId,
        available: false,
      },
    });

    return this.repository.update(id, { status: 'APPROVED' });
  }

  async reject(id: number, directorId: number) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    const director = await this.prisma.users.findUnique({
      where: { id: directorId },
      include: {
        upsUser: {
          include: { school: true, profile: true },
        },
      },
    });

    if (!director) {
      throw new NotFoundException('Diretor não encontrado');
    }

    const roleName = this.getPrimaryRoleName(director);
    if (!this.isManagerRole(roleName)) {
      throw new ForbiddenException('Apenas gestor pode rejeitar solicitações');
    }

    const classData = await this.prisma.classes.findUnique({
      where: { id: request.classId },
      include: { school: true },
    });

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const directorSchoolId = director.upsUser[0]?.schoolId;
    if (roleName !== 'MASTER' && directorSchoolId !== classData.schoolId) {
      throw new ForbiddenException(
        'Você só pode rejeitar solicitações de aulas da sua escola',
      );
    }

    return this.repository.update(id, { status: 'REJECTED' });
  }

  async cancel(id: number, professorId: number) {
    const request = await this.findOne(id);

    if (request.professorId !== professorId) {
      throw new ForbiddenException('Apenas o professor pode cancelar');
    }

    if (request.status === 'APPROVED') {
      const classData = await this.prisma.classes.findUnique({
        where: { id: request.classId },
      });

      if (classData && classData.enrolledById === professorId) {
        await this.prisma.classes.update({
          where: { id: request.classId },
          data: {
            enrolledById: null,
            available: true,
          },
        });
      }
    }

    return this.repository.update(id, { status: 'CANCELLED' });
  }
}
