import { CreateClassDto } from './create-class.dto';
import { GetClassDto } from './get-class.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('Classes DTOs', () => {
  describe('CreateClassDto', () => {
    it('should validate a valid DTO', async () => {
      const plain = {
        schoolId: 1,
        subjectId: 1,
        createdByd: 1,
        statededAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      };
      const dto = plainToInstance(CreateClassDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('GetClassDto', () => {
    it('should validate an empty DTO', async () => {
      const dto = plainToInstance(GetClassDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a valid DTO with params', async () => {
      const plain = { userId: 1, schoolId: 2 };
      const dto = plainToInstance(GetClassDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(typeof dto.userId).toBe('number');
    });
  });
});
