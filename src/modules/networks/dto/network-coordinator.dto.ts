import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateNetworkCoordinatorDto {
  @ApiProperty({ description: 'Usuário que vai coordenar a rede' })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Rede (município) que ele vai coordenar' })
  @IsInt()
  @Min(1)
  networkId: number;
}
