import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { email: 'test@test.com' } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
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

  describe('findOneBy', () => {
    it('should call repository.findOneBy', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.findOneBy('test@test.com');
      expect(repository.findOneBy).toHaveBeenCalledWith('test@test.com');
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('should call repository.update', async () => {
      const dto = { name: 'Updated' } as any;
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
