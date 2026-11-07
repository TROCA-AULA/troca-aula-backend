import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  // Mesmo mínimo da troca de senha (defeito D10: o cadastro aceitava "123").
  @ApiProperty({ minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres' })
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  subjectId?: number;

  // Município onde mora: só vale para a regra do município enquanto o
  // professor não tiver contrato (vínculo aprovado) em nenhuma escola.
  @ApiProperty({ required: false, description: 'Rede (município) onde mora' })
  @IsOptional()
  @IsInt()
  residenceNetworkId?: number;
}
