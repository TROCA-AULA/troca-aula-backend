import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.users.create({
      data: {
        ...createUserDto,
      } as Prisma.UsersCreateInput,
    });
  }

  async assignProfile(userId: number, profileId: number, schoolId: number) {
    return this.prisma.usersProfilesSchools.create({
      data: {
        school: {
          connect: {
            id: schoolId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        profile: {
          connect: {
            id: profileId,
          },
        },
      } as Prisma.UsersProfilesSchoolsCreateInput,
    });
  }

  findAll() {
    return this.prisma.users.findMany({
      include: {
        upsUser: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.users.findUnique({
      where: { id },
      include: { upsUser: true },
    });
  }

  findOneBy(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      include: { upsUser: true },
    });
  }

  update(id: number, updateProfileDto: UpdateUserDto) {
    return this.prisma.users.update({
      data: {
        ...updateProfileDto,
      } as Prisma.UsersUpdateInput,
      where: { id },
    });
  }

  remove(id: number) {
    return this.prisma.users.delete({ where: { id } });
  }
}
