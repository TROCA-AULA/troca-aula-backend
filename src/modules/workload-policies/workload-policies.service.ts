import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkloadPolicyDto } from './dto/create-workload-policy.dto';
import { UpdateWorkloadPolicyDto } from './dto/update-workload-policy.dto';
import { WorkloadPoliciesRepository } from './workload-policies.repository';

@Injectable()
export class WorkloadPoliciesService {
  constructor(private readonly repository: WorkloadPoliciesRepository) {}

  async create(dto: CreateWorkloadPolicyDto) {
    const existing = await this.repository.findByNetworkAndType(
      dto.networkId,
      dto.workloadTypeId,
    );
    if (existing) {
      throw new ConflictException(
        'Esta rede já tem uma política para este tipo de carga. Edite a existente.',
      );
    }
    return this.repository.create(dto);
  }

  findAll(networkId?: number) {
    return this.repository.findAll(networkId);
  }

  async findOne(id: number) {
    const policy = await this.repository.findOne(id);
    if (!policy) {
      throw new NotFoundException('Política de carga horária não encontrada');
    }
    return policy;
  }

  update(id: number, dto: UpdateWorkloadPolicyDto) {
    return this.repository.update(id, dto);
  }
}
