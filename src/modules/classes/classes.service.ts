import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesRepository } from './classes.repository';
import { GetClassDto } from './dto/get-class.dto';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ClassesService {
  constructor(
    private readonly repository: ClassesRepository,
    private readonly userRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}
  create(createClassDto: CreateClassDto) {
    return this.repository.create(createClassDto);
  }

  async findAll(params: GetClassDto) {
    let currentParams = params;
    if (params.userId) {
      const user = await this.userRepository.findOne(params.userId);
      if (user?.upsUser[0].profileId != 3) {
        currentParams = {
          schoolId: user?.upsUser[0].schoolId,
        };
      }
    }
    return this.repository.findAll(currentParams);
  }

  findOne(id: number) {
    return this.repository.findOne(id);
  }

  update(id: number, updateClassDto: UpdateClassDto) {
    return this.repository.update(id, updateClassDto);
  }

  remove(id: number) {
    return this.repository.remove(id);
  }

  async enroll(classId: number, userId: number) {
    const classData = await this.prisma.classes.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (classData.enrolledById && classData.enrolledById !== userId) {
      throw new BadRequestException(
        'Aula já está inscrita por outro professor',
      );
    }

    if (classData.enrolledById === userId) {
      throw new BadRequestException('Você já está inscrito nesta aula');
    }

    return this.prisma.classes.update({
      where: { id: classId },
      data: { enrolledById: userId },
    });
  }

  async unenroll(classId: number, userId: number) {
    const classData = await this.prisma.classes.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (!classData.enrolledById) {
      throw new BadRequestException('Aula não está inscrita por ninguém');
    }

    if (classData.enrolledById !== userId) {
      throw new ForbiddenException(
        'Apenas o professor inscrito pode cancelar inscrição',
      );
    }

    return this.prisma.classes.update({
      where: { id: classId },
      data: { enrolledById: null },
    });
  }
}
