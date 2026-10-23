import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

// Correção do D1: o PATCH /users/:id NÃO aceita mais `password` (trocar
// senha é só por /auth/change-password ou pelo reset de um gestor). Quem
// pode mexer em cada campo é decidido no UsersService.update.
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Disciplina do professor' })
  @IsOptional()
  @IsInt()
  subjectId?: number;

  @ApiPropertyOptional({
    description:
      'Limite de substituições por semestre (null = sem limite). Só gestor.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  substitutionLimitPerSemester?: number | null;

  @ApiPropertyOptional({
    description:
      'Rede (município) onde mora; null limpa. Só conta se a pessoa não tiver contrato em nenhuma escola.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  residenceNetworkId?: number | null;
}
