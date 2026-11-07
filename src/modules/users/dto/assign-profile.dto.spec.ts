import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignProfileDto } from './assign-profile.dto';

describe('AssignProfileDto', () => {
  it('accepts integer ids', async () => {
    const dto = plainToInstance(AssignProfileDto, {
      profileId: 3,
      schoolId: 1,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('transforms numeric strings into numbers', async () => {
    const dto = plainToInstance(AssignProfileDto, {
      profileId: '3',
      schoolId: '1',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.profileId).toBe(3);
    expect(dto.schoolId).toBe(1);
  });

  it('rejects a missing payload', async () => {
    const dto = plainToInstance(AssignProfileDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(2);
  });

  it('rejects non-numeric ids', async () => {
    const dto = plainToInstance(AssignProfileDto, {
      profileId: 'not-a-number',
      schoolId: 1.5,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(2);
  });
});
