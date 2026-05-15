import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  schoolId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  subjectId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  createdByd: number;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  statededAt: Date;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  finishedAt: Date;
}
