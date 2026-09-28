import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetCoverageStatsDto } from './get-coverage-stats.dto';

describe('GetCoverageStatsDto', () => {
  it('accepts an empty query (all filters are optional)', async () => {
    const dto = plainToInstance(GetCoverageStatsDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('transforms numeric strings and accepts every filter', async () => {
    const dto = plainToInstance(GetCoverageStatsDto, {
      schoolId: '1',
      subjectId: '2',
      dayOfWeek: '3',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.schoolId).toBe(1);
    expect(dto.subjectId).toBe(2);
    expect(dto.dayOfWeek).toBe(3);
  });

  it.each([0, 6])(
    'accepts the dayOfWeek boundary value %s',
    async (dayOfWeek) => {
      const dto = plainToInstance(GetCoverageStatsDto, { dayOfWeek });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it.each([-1, 7])('rejects dayOfWeek %s outside 0..6', async (dayOfWeek) => {
    const dto = plainToInstance(GetCoverageStatsDto, { dayOfWeek });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects non-numeric filters', async () => {
    const dto = plainToInstance(GetCoverageStatsDto, {
      schoolId: 'not-a-number',
      subjectId: 1.5,
      dayOfWeek: 'abc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(3);
  });
});
