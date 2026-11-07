import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FindUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  schoolId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  profileId?: number;

  // Busca exata por e-mail — é como o diretor encontra um professor recém
  // cadastrado (ainda sem escola) para vinculá-lo.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}
