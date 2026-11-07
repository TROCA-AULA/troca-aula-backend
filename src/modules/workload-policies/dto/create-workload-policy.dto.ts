import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

// Sem `schoolId` de propósito: política é sempre por REDE (Design Doc,
// Seção 4 — "o que é comum vs. o que é configurável por rede"). Por isso
// esta rota não passa pelo TenantGuard (que só resolve schoolId) — só
// RolesGuard(MASTER), ver WorkloadPoliciesController.
export class CreateWorkloadPolicyDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  networkId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  workloadTypeId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxHoursPerWeek?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  ataOficialRequired?: boolean;
}
