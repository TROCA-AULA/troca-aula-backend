import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkloadPolicyDto } from './create-workload-policy.dto';
import { UpdateWorkloadPolicyDto } from './update-workload-policy.dto';

describe('WorkloadPolicies DTOs', () => {
  describe('CreateWorkloadPolicyDto', () => {
    it('accepts a valid payload with all optional fields', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: 10,
        ataOficialRequired: true,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts a valid payload without optional fields', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a missing payload', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it.each(['networkId', 'workloadTypeId'])(
      'rejects a non-positive %s',
      async (field) => {
        const dto = plainToInstance(CreateWorkloadPolicyDto, {
          networkId: 1,
          workloadTypeId: 4,
          [field]: 0,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
      },
    );

    it('rejects non-integer id fields', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: '1',
        workloadTypeId: 1.5,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it('rejects an invalid maxHoursPerWeek', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: '10',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-negative maxHoursPerWeek', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: -1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-boolean ataOficialRequired', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
        ataOficialRequired: 'yes',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects unknown properties with the production pipe options', async () => {
      const dto = plainToInstance(CreateWorkloadPolicyDto, {
        networkId: 1,
        workloadTypeId: 4,
        schoolId: 1,
      });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateWorkloadPolicyDto', () => {
    it('accepts the editable fields', async () => {
      const dto = plainToInstance(UpdateWorkloadPolicyDto, {
        maxHoursPerWeek: 12,
        ataOficialRequired: false,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects networkId/workloadTypeId (identity of the policy)', async () => {
      const dto = plainToInstance(UpdateWorkloadPolicyDto, {
        maxHoursPerWeek: 12,
        networkId: 1,
        workloadTypeId: 4,
      });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid editable values', async () => {
      const dto = plainToInstance(UpdateWorkloadPolicyDto, {
        maxHoursPerWeek: -1,
        ataOficialRequired: 'yes',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });
  });
});
