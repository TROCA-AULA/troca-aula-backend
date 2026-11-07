import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Fase 4 (COULD) do Design Doc: indicador estatístico simples de risco de
// aula vaga, sem ML/pipeline — só uma agregação sobre Classes já existente.
export class GetCoverageStatsDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  schoolId?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  subjectId?: number;

  // 0 (domingo) a 6 (sábado), mesma convenção já usada em Classes.dayOfWeek.
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek?: number;
}
