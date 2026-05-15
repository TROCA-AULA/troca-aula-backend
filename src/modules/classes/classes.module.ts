import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ClassesRepository } from './classes.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ClassesController],
  providers: [ClassesRepository, ClassesService],
  exports: [ClassesRepository],
})
export class ClassesModule {}
