import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  // Fase 2 — toda escola pertence a uma rede (Design Doc, ADR-004). Quem cria
  // é sempre MASTER (ver SchoolsController), então informar o networkId de
  // destino explicitamente é aceitável — não há ainda um fluxo de "criar
  // rede e primeira escola juntas" (ficaria a cargo do frontend compor as
  // duas chamadas, POST /networks depois POST /schools).
  @ApiProperty()
  @IsInt()
  @IsPositive()
  networkId: number;
}
