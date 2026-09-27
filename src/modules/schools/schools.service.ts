import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsRepository } from './schools.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly tenantContextService: TenantContextService,
  ) {}
  create(createSchoolDto: CreateSchoolDto) {
    return this.schoolsRepository.create(createSchoolDto);
  }

  findAll() {
    return this.schoolsRepository.findAll();
  }

  findOne(id: number) {
    return this.schoolsRepository.findOne(id);
  }

  update(id: number, updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsRepository.update(id, updateSchoolDto);
  }

  remove(id: number) {
    return this.schoolsRepository.remove(id);
  }

  // Guarda de posse feita AQUI (não no TenantGuard): o schoolId desta rota
  // vem do parâmetro :id, e o TenantGuard hoje só resolve schoolId a partir
  // de body/query (mesmo padrão já usado em ClassesService.update/remove).
  async updatePriorityWindow(
    id: number,
    priorityWindowHours: number | null,
    requesterId: number,
  ) {
    const school = await this.schoolsRepository.findOne(id);
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        id,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode configurar a regra de prioridade da própria escola',
      );
    }

    return this.schoolsRepository.updatePriorityWindow(
      id,
      priorityWindowHours,
    );
  }
}
