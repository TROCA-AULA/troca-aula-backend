import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindUsersQueryDto } from './find-users-query.dto';

describe('FindUsersQueryDto', () => {
  it('accepts an empty query (all filters are optional)', async () => {
    const dto = plainToInstance(FindUsersQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('transforms numeric strings into numbers', async () => {
    const dto = plainToInstance(FindUsersQueryDto, {
      schoolId: '1',
      profileId: '3',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.schoolId).toBe(1);
    expect(dto.profileId).toBe(3);
  });

  it('rejects non-numeric filters', async () => {
    const dto = plainToInstance(FindUsersQueryDto, {
      schoolId: 'not-a-number',
      profileId: 1.5,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(2);
  });
});
