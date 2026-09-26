import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

// "Jornada Docente" (estágio Sr. Walter §1). `networkId` e `createdById` não
// entram aqui de propósito: networkId é resolvido pelo service a partir de
// `schools.networkId` (não confiamos em input do cliente para isso), e
// createdById vem de `req.user.id` — ver TeacherWorkloadRecordsController.
export class CreateTeacherWorkloadRecordDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  schoolId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  workloadTypeId: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  hours: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ataOficialRef?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  validFrom: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validTo?: Date;

  // Não persistido na própria linha (a tabela não tem coluna de
  // justificativa) — repassado ao AuditLogService.record() quando presente.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  justification?: string;
}
