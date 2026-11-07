import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateWorkloadPolicyDto } from './create-workload-policy.dto';

// networkId/workloadTypeId não são editáveis (identidade da política, chave
// única da tabela) — para "mudar" a combinação, cria-se uma nova política.
export class UpdateWorkloadPolicyDto extends PartialType(
  OmitType(CreateWorkloadPolicyDto, ['networkId', 'workloadTypeId'] as const),
) {}
