import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

// Regra de prioridade da PRÓPRIA escola (Design Doc - não confundir com
// WorkloadPolicies, que é configuração por REDE): quantas horas, após criar
// uma aula vaga, ela fica visível só para professores vinculados a esta
// escola antes de abrir para professores externos. Configurável pela
// direção da própria escola (não só MASTER) - ver
// SchoolsController.updatePriorityWindow.
export class UpdatePriorityWindowDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Horas de janela de prioridade. null/omitido = sem janela (aberta a todos imediatamente).',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  priorityWindowHours?: number | null;
}
