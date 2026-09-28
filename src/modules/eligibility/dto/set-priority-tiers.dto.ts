import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TIER_SCOPES } from '../eligibility.types';

export class PriorityTierDto {
  @ApiProperty({ description: 'Ordem do nível (1 = mais restrito)' })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Atraso em minutos a partir da criação da vaga' })
  @IsInt()
  @Min(0)
  delayMinutes: number;

  @ApiProperty({ enum: TIER_SCOPES })
  @IsIn(TIER_SCOPES)
  scopeType: string;

  @ApiPropertyOptional({
    description:
      'Para o escopo REDE_INTERCONECTADA_INTERESSADA: restringe o nível a estas redes (precisam estar entre as interconectadas pela rede da escola)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  restrictedNetworkIds?: number[];
}

export class SetPriorityTiersDto {
  @ApiProperty({ type: [PriorityTierDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PriorityTierDto)
  tiers: PriorityTierDto[];
}
