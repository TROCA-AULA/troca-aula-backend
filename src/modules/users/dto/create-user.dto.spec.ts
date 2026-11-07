import { CreateUserDto } from './create-user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// P4/P15 (problemas-conhecidos.md do frontend): `profileId`/`schoolId` não
// fazem parte do CreateUserDto — o vínculo escola/perfil é criado depois via
// POST /users/:id/assign-profile. O ValidationPipe de produção usa
// forbidNonWhitelisted (rejeita propriedades extras com 400); reproduzido
// aqui com as mesmas opções.
describe('CreateUserDto', () => {
  it('should validate a valid user DTO', async () => {
    const plain = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with optional subjectId', async () => {
    const plain = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
      subjectId: 3,
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when required fields are missing', async () => {
    const dto = plainToInstance(CreateUserDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid subjectId type', async () => {
    const plain = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
      subjectId: 'not-a-number',
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject extra profileId/schoolId with the production pipe options', async () => {
    const plain = {
      profileId: 3,
      schoolId: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      password: 'password123',
    };
    const dto = plainToInstance(CreateUserDto, plain);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
