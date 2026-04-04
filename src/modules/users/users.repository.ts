import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { schoolId, profileId, ...userPayload } = createUserDto;
    const user = await this.prisma.users.create({
      data: {
        ...userPayload,
      } as Prisma.UsersCreateInput,
    });
    await this.prisma.usersProfilesSchools.create({
      data: {
        school: {
          connect: {
            id: schoolId,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
        profile: {
          connect: {
            id: profileId,
          },
        },
      } as Prisma.UsersProfilesSchoolsCreateInput,
    });
    return user;
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
