import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Fase 5 (modelo de grupos): a escola cria grupos de prioridade (0 recebe
// primeiro) com tempo de espera; o professor do grupo vê a vaga quando o
// tempo do grupo dele passa.
export class CreateTeacherGroupDto {
  @ApiProperty({ example: 'Professores da casa' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description:
      'Prioridade do grupo (0 = recebe primeiro). Se omitida, entra depois do último grupo.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty({
    description: 'Tempo de espera em minutos a partir da criação da vaga',
  })
  @IsInt()
  @Min(0)
  delayMinutes: number;
}

export class UpdateTeacherGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Prioridade do grupo (0 = primeiro)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number;
}

export class SetGroupMembersDto {
  @ApiProperty({ type: [Number], description: 'Ids dos professores do grupo' })
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  professorIds: number[];
}

export class UpdatePrioritySettingsDto {
  @ApiPropertyOptional({
    description:
      'Espera mínima (minutos) para professores sem grupo. Eles sempre recebem depois do grupo mais demorado; este valor só vale se for maior que isso.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ungroupedDelayMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Redes que a escola aceita (subconjunto das interconectadas pelo município); null/[] = aceita todas as permitidas',
    type: [Number],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  acceptedNetworkIds?: number[] | null;
}
