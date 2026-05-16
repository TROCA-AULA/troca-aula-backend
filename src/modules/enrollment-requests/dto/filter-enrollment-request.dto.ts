import { IsOptional, IsString, IsInt } from 'class-validator';

export class FilterEnrollmentRequestDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  classId?: number;

  @IsOptional()
  @IsInt()
  professorId?: number;
}