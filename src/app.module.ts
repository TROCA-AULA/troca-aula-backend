import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/configuration';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EnrollmentRequestsModule } from './modules/enrollment-requests/enrollment-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    SchoolsModule,
    SubjectsModule,
    ClassesModule,
    ProfileModule,
    EnrollmentRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
