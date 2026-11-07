import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEnrollmentRequestDto } from './create-enrollment-request.dto';
import { FilterEnrollmentRequestDto } from './filter-enrollment-request.dto';
import { UpdateEnrollmentRequestDto } from './update-enrollment-request.dto';

describe('EnrollmentRequests DTOs', () => {
  describe('FilterEnrollmentRequestDto', () => {
    it('accepts an empty filter (all fields are optional)', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('transforms numeric strings and accepts every filter', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, {
        status: 'PENDING',
        classId: '1',
        professorId: '2',
        userId: '3',
        schoolId: '4',
        createdAfter: '2026-01-01T00:00:00.000Z',
        createdBefore: '2026-02-01T00:00:00.000Z',
        mes: '2026-03',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.classId).toBe(1);
      expect(dto.professorId).toBe(2);
      expect(dto.userId).toBe(3);
      expect(dto.schoolId).toBe(4);
    });

    it('rejects a non-string status', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, { status: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a classId that is not a number', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, {
        classId: 'not-a-number',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects non-integer professorId/userId/schoolId values', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, {
        professorId: 'abc',
        userId: 'abc',
        schoolId: 'abc',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(3);
    });

    it('rejects invalid createdAfter/createdBefore dates', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, {
        createdAfter: 'not-a-date',
        createdBefore: 'also-not-a-date',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it('rejects a non-string mes', async () => {
      const dto = plainToInstance(FilterEnrollmentRequestDto, { mes: 202603 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateEnrollmentRequestDto', () => {
    it('accepts an integer classId', async () => {
      const dto = plainToInstance(CreateEnrollmentRequestDto, { classId: 1 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a missing classId', async () => {
      const dto = plainToInstance(CreateEnrollmentRequestDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-integer classId', async () => {
      const dto = plainToInstance(CreateEnrollmentRequestDto, {
        classId: '1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });

  describe('UpdateEnrollmentRequestDto', () => {
    it('can be instantiated with a status', () => {
      const dto = new UpdateEnrollmentRequestDto();
      dto.status = 'APPROVED';
      expect(dto.status).toBe('APPROVED');
    });
  });
});
