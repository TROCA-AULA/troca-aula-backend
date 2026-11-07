import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Defeito D20: a tela pedia o motivo da rejeição, mas o servidor descartava.
export class RejectEnrollmentRequestDto {
  @ApiPropertyOptional({
    description: 'Motivo da rejeição, mostrado ao professor',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
