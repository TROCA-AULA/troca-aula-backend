import { IsInt } from 'class-validator';

export class CreateEnrollmentRequestDto {
  @IsInt()
  classId: number;
}