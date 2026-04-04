import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { ClassesRepository } from './classes.repository';
import { UsersRepository } from '../users/users.repository';

describe('ClassesService', () => {
  let service: ClassesService;
  let repository: ClassesRepository;
  let userRepository: UsersRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: ClassesRepository,
          useValue: mockRepository,
        },
        {
          provide: UsersRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    repository = module.get<ClassesRepository>(ClassesRepository);
    userRepository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { schoolId: 1, subjectId: 1, createdByd: 1 } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll with user schoolId if profile is not 3', async () => {
      const params = { userId: 1 };
      const user = { upsUser: [{ profileId: 1, schoolId: 10 }] };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(userRepository.findOne).toHaveBeenCalledWith(1);
      expect(repository.findAll).toHaveBeenCalledWith({ schoolId: 10 });
    });

    it('should call repository.findAll with original params if profile is 3', async () => {
      const params = { userId: 1 };
      const user = { upsUser: [{ profileId: 3, schoolId: 10 }] };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });

    it('should call repository.findAll with original params if no userId', async () => {
      const params = {};
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('should call repository.update', async () => {
      const dto = { registredById: 2 } as any;
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.update(1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call repository.remove', async () => {
      mockRepository.remove.mockResolvedValue({ id: 1 });
      const result = await service.remove(1);
      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });
});
