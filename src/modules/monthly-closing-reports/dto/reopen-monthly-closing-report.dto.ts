import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// §6.3 da proposta ("correção explícita"): reabrir um relatório já
// conferido/fechado exige motivo — o texto vai para o AuditLog e evita
// reabertura silenciosa.
export class ReopenMonthlyClosingReportDto {
  @ApiProperty({ description: 'Motivo da reabertura (registrado no AuditLog)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  justification: string;
}
