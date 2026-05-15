import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { UpdateSwapRequestDto } from './dto/update-swap-request.dto';
import { GetSwapRequestDto } from './dto/get-swap-request.dto';
import { SwapRequestsRepository } from './swap-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SwapRequestsService {
  constructor(
    private readonly repository: SwapRequestsRepository,
    private readonly userRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createSwapRequestDto: CreateSwapRequestDto, userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        upsUser: {
          include: { profile: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const profileName = user.upsUser[0]?.profile?.name;

    if (profileName !== 'DIRETOR' && profileName !== 'AUXILIAR_ADMIN') {
      throw new ForbiddenException(
        'Apenas diretor ou auxiliar administrativo pode criar solicitação de troca',
      );
    }

    const classData = await this.prisma.classes.findUnique({
      where: { id: createSwapRequestDto.classId },
    });
    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const hasConflict = await this.checkConflict(
      createSwapRequestDto.targetId,
      classData.dayOfWeek,
      classData.startTime,
      classData.endTime,
    );

    if (hasConflict) {
      throw new BadRequestException('Conflito de horário detectado');
    }

    return this.repository.create({
      class: { connect: { id: createSwapRequestDto.classId } },
      requester: { connect: { id: userId } },
      target: { connect: { id: createSwapRequestDto.targetId } },
      status: 'PENDING',
    });
  }

  private async checkConflict(
    targetId: number,
    dayOfWeek: number | null,
    startTime: string | null,
    endTime: string | null,
  ): Promise<boolean> {
    if (!dayOfWeek || !startTime || !endTime) {
      return false;
    }

    const targetClasses = await this.prisma.classes.findMany({
      where: {
        OR: [{ enrolledById: targetId }, { createdByd: targetId }],
        dayOfWeek: dayOfWeek,
        deletedAt: null,
      },
    });

    for (const cls of targetClasses) {
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

  async findAll(params: GetSwapRequestDto, userId: number) {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.type === 'created') {
      where.requesterId = userId;
    } else if (params.type === 'received') {
      where.targetId = userId;
    } else {
      where.OR = [{ requesterId: userId }, { targetId: userId }];
    }

    return this.repository.findAll({ where });
  }

  async findOne(id: number) {
    const swapRequest = await this.repository.findOne(id);
    if (!swapRequest) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    return swapRequest;
  }

  async accept(id: number, userId: number) {
    const swapRequest = await this.findOne(id);

    if (swapRequest.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.id !== swapRequest.targetId) {
      throw new ForbiddenException('Apenas o professor替代 pode aceitar');
    }

    const classData = await this.prisma.classes.findUnique({
      where: { id: swapRequest.classId },
    });

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (user.subjectId !== classData.subjectId) {
      throw new ForbiddenException('Você só pode aceitar aulas da sua matéria');
    }

    return this.repository.update(id, { status: 'APPROVED' });
  }

  async reject(id: number, userId: number) {
    const swapRequest = await this.findOne(id);

    if (swapRequest.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    if (userId !== swapRequest.targetId) {
      throw new ForbiddenException('Apenas o professor替代 pode rejeitar');
    }

    return this.repository.update(id, { status: 'REJECTED' });
  }

  async cancel(id: number, userId: number) {
    const swapRequest = await this.findOne(id);

    if (swapRequest.status !== 'PENDING') {
      throw new BadRequestException(
        'Apenas solicitações pendentes podem ser canceladas',
      );
    }

    if (userId !== swapRequest.requesterId) {
      throw new ForbiddenException('Apenas o criador pode cancelar');
    }

    return this.repository.update(id, { status: 'CANCELLED' });
  }
}
