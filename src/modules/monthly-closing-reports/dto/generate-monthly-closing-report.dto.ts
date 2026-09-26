import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Matches } from 'class-validator';

// Gera/regera o relatório mensal de fechamento (estágio Sr. Walter §6.1).
// `referenceMonth` no formato YYYY-MM (mesmo formato da coluna no banco).
export class GenerateMonthlyClosingReportDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  schoolId: number;

  @ApiProperty({ example: '2026-03' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'referenceMonth deve estar no formato YYYY-MM',
  })
  referenceMonth: string;
}
