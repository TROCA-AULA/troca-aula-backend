import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNetworkDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
