import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  assignProfile(userId: number, profileId: number, schoolId: number) {
    return this.usersRepository.assignProfile(userId, profileId, schoolId);
  }

  findAll() {
    return this.usersRepository.findAll();
  }

  findOne(id: number) {
    return this.usersRepository.findOne(id);
  }
  findOneBy(email: string) {
    return this.usersRepository.findOneBy(email);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.usersRepository.remove(id);
  }
}
