import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsRepository } from './schools.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly tenantContextService: TenantContextService,
  ) {}
  async create(createSchoolDto: CreateSchoolDto, requesterId: number) {
    await this.tenantContextService.assertCanManageNetwork(
      requesterId,
      createSchoolDto.networkId,
    );
    return this.schoolsRepository.create(createSchoolDto);
  }

  findAll() {
    return this.schoolsRepository.findAll();
  }

  findOne(id: number) {
    return this.schoolsRepository.findOne(id);
  }

  async update(
    id: number,
    updateSchoolDto: UpdateSchoolDto,
    requesterId: number,
  ) {
    const school = await this.schoolsRepository.findOne(id);
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }
    await this.tenantContextService.assertCanManageNetwork(
      requesterId,
      school.networkId,
    );
    if (
      updateSchoolDto.networkId !== undefined &&
      updateSchoolDto.networkId !== school.networkId
    ) {
      await this.tenantContextService.assertCanManageNetwork(
        requesterId,
        updateSchoolDto.networkId,
      );
    }
    return this.schoolsRepository.update(id, updateSchoolDto);
  }

  remove(id: number) {
    return this.schoolsRepository.remove(id);
  }
}
