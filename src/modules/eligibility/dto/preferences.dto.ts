import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NetworkReferenceDto {
  @ApiProperty()
  @IsInt()
  networkId: number;
}

export class SchoolReferenceDto {
  @ApiProperty()
  @IsInt()
  schoolId: number;
}

export class SetNetworkInterconnectionsDto {
  @ApiProperty({
    description: 'Redes que esta rede aceita (direcional)',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  allowedNetworkIds: number[];
}
