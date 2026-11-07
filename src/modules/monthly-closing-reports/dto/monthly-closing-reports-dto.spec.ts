import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateMonthlyClosingReportDto } from './generate-monthly-closing-report.dto';
import { ReopenMonthlyClosingReportDto } from './reopen-monthly-closing-report.dto';

describe('MonthlyClosingReports DTOs', () => {
  describe('GenerateMonthlyClosingReportDto', () => {
    it('accepts a valid payload', async () => {
      const dto = plainToInstance(GenerateMonthlyClosingReportDto, {
        userId: 10,
        schoolId: 1,
        referenceMonth: '2026-03',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a missing payload', async () => {
      const dto = plainToInstance(GenerateMonthlyClosingReportDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(3);
    });

    it('rejects non-positive userId/schoolId', async () => {
      const dto = plainToInstance(GenerateMonthlyClosingReportDto, {
        userId: 0,
        schoolId: -1,
        referenceMonth: '2026-03',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it('rejects non-integer userId/schoolId', async () => {
      const dto = plainToInstance(GenerateMonthlyClosingReportDto, {
        userId: '10',
        schoolId: 1.5,
        referenceMonth: '2026-03',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
    });

    it.each(['2026-13', '2026-00', '03-2026', '2026/03', '2026-3'])(
      'rejects the invalid referenceMonth %s',
      async (referenceMonth) => {
        const dto = plainToInstance(GenerateMonthlyClosingReportDto, {
          userId: 10,
          schoolId: 1,
          referenceMonth,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
      },
    );
  });

  describe('ReopenMonthlyClosingReportDto', () => {
    it('accepts a justification with at least 10 characters', async () => {
      const dto = plainToInstance(ReopenMonthlyClosingReportDto, {
        justification: 'Horas lançadas erradas em 12/03',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a missing justification', async () => {
      const dto = plainToInstance(ReopenMonthlyClosingReportDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual(
        expect.objectContaining({
          isNotEmpty: expect.any(String),
          isString: expect.any(String),
        }),
      );
    });

    it('rejects an empty justification', async () => {
      const dto = plainToInstance(ReopenMonthlyClosingReportDto, {
        justification: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a justification shorter than 10 characters', async () => {
      const dto = plainToInstance(ReopenMonthlyClosingReportDto, {
        justification: 'curto',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('rejects a non-string justification', async () => {
      const dto = plainToInstance(ReopenMonthlyClosingReportDto, {
        justification: 1234567890,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });
});
