import { IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetSwapRequestDto {
  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  type?: 'created' | 'received';

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  classId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  schoolId?: number;
}
