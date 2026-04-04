import { CreateUserDto } from './create-user.dto';
import { ProfileEnum } from '../../profile/profile.enum';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('CreateUserDto', () => {
  it('should validate a valid user DTO', async () => {
    const plain = {
      profileId: ProfileEnum.PROFESSOR,
      schoolId: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid profileId', async () => {
    const plain = {
      profileId: 999, // Invalid
      schoolId: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
