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

// Fase 5 (modelo de grupos): a escola cria grupos com nome e tempo de
// espera; o professor classificado no grupo vê a vaga após o delay dele.
export class CreateTeacherGroupDto {
  @ApiProperty({ example: 'Professores da casa' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  name: string;

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
      'Delay padrão (minutos) para professores fora de qualquer grupo',
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
