import { Module } from '@nestjs/common';
import { EnrollmentRequestsService } from './enrollment-requests.service';
import { EnrollmentRequestsController } from './enrollment-requests.controller';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [UsersModule, ClassesModule],
  controllers: [EnrollmentRequestsController],
  providers: [EnrollmentRequestsService, EnrollmentRequestsRepository],
  exports: [EnrollmentRequestsService],
})
export class EnrollmentRequestsModule {}
