import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeacherWorkloadRecordDto } from './create-teacher-workload-record.dto';
import { UpdateTeacherWorkloadRecordDto } from './update-teacher-workload-record.dto';

describe('TeacherWorkloadRecords DTOs', () => {
  describe('CreateTeacherWorkloadRecordDto', () => {
    it('accepts a valid payload with all optional fields', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: 5,
        ataOficialRef: 'ATA-2026-01',
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2026-06-30T00:00:00.000Z',
        justification: 'Suplementação aprovada em ata',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.validFrom).toBeInstanceOf(Date);
      expect(dto.validTo).toBeInstanceOf(Date);
    });

    it('accepts a valid payload without optional fields', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: 5,
        validFrom: '2026-01-01T00:00:00.000Z',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('rejects a missing required payload', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(5);
    });

    it.each(['userId', 'schoolId', 'workloadTypeId'])(
      'rejects a non-positive %s',
      async (field) => {
        const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
          userId: 10,
          schoolId: 1,
          workloadTypeId: 4,
          hours: 5,
          validFrom: '2026-01-01T00:00:00.000Z',
          [field]: 0,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
      },
    );

    it('rejects non-integer id fields', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: '10',
        schoolId: 1.5,
        workloadTypeId: 4,
        hours: 5,
        validFrom: '2026-01-01T00:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it('rejects non-positive/non-numeric hours', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: '5',
        validFrom: '2026-01-01T00:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects an invalid validFrom date', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: 5,
        validFrom: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-string ataOficialRef', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: 5,
        validFrom: '2026-01-01T00:00:00.000Z',
        ataOficialRef: 123,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-string justification', async () => {
      const dto = plainToInstance(CreateTeacherWorkloadRecordDto, {
        userId: 10,
        schoolId: 1,
        workloadTypeId: 4,
        hours: 5,
        validFrom: '2026-01-01T00:00:00.000Z',
        justification: 123,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });

  describe('UpdateTeacherWorkloadRecordDto', () => {
    it('accepts the editable fields', async () => {
      const dto = plainToInstance(UpdateTeacherWorkloadRecordDto, {
        workloadTypeId: 4,
        hours: 6,
        validFrom: '2026-02-01T00:00:00.000Z',
        justification: 'ajuste',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects userId/schoolId (not editable — identity of the record)', async () => {
      const dto = plainToInstance(UpdateTeacherWorkloadRecordDto, {
        hours: 6,
        userId: 10,
        schoolId: 1,
      });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid editable values', async () => {
      const dto = plainToInstance(UpdateTeacherWorkloadRecordDto, {
        hours: -1,
        validFrom: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });
  });
});
