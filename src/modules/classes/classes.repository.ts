import { Injectable } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import { GetClassDto } from './dto/get-class.dto';

@Injectable()
export class ClassesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProfileDto: CreateClassDto) {
    return await this.prisma.classes.create({
      data: {
        school: {
          connect: {
            id: createProfileDto.schoolId,
          },
        },
        subject: {
          connect: {
            id: createProfileDto.subjectId,
          },
        },
        createdBy: { connect: { id: createProfileDto.createdByd } },
        statededAt: createProfileDto.statededAt,
        finishedAt: createProfileDto.finishedAt,
      } as any as Prisma.ClassesCreateInput,
    });
  }

  findAll(params: GetClassDto) {
    let where = {};
    if (params?.userId) {
      where = {
        OR: [
          { registredById: null },
          {
            registredById: params.userId,
          },
        ],
      };
    }
    if (params?.schoolId) {
      where = {
        ...where,

        schoolId: params.schoolId,
      };
    }
    if (Object.keys(where).length > 0) {
      where = {
        where,
      };
    }
    return this.prisma.classes.findMany({
      ...where,
      include: {
        school: true,
        subject: true,
        createdBy: {
          include: {
            upsUser: {
              include: {
                profile: true,
              },
            },
          },
        },
        approvedBy: true,
        registredBy: true,
        profile: true,
      },
      orderBy: {
        statededAt: 'desc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.classes.findUnique({ where: { id } });
  }

  async update(id: number, updateProfileDto: UpdateClassDto) {
    let updateData: Prisma.ClassesUpdateInput = {};
    if (updateProfileDto.approvedById) {
      const clas = await this.prisma.classes.findUnique({
        where: {
          id,
        },
      });
      const [userProfilesShools] =
        await this.prisma.usersProfilesSchools.findMany({
          where: {
            userId: updateProfileDto.approvedById,
            schoolId: clas?.schoolId,
          },
        });

      updateData = {
        approvedBy: { connect: { id: updateProfileDto.approvedById } },
        profile: { connect: { id: userProfilesShools?.profileId } },
        approvedAt: new Date(),
      };
    }
    if (updateProfileDto.registredById) {
      updateData = {
        ...updateData,
        registredBy: {
          connect: {
            id: updateProfileDto.registredById,
          },
        },
      };
    }

    return this.prisma.classes.update({
      data: {
        ...updateData,
      } as Prisma.ClassesUpdateInput,
      where: { id },
    });
  }

  remove(id: number) {
    return this.prisma.classes.delete({ where: { id } });
  }
}
