import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let repository: SchoolsRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        {
          provide: SchoolsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SchoolsService>(SchoolsService);
    repository = module.get<SchoolsRepository>(SchoolsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { name: 'School A' } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([{ id: 1, name: 'School A' }]);
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'School A' }]);
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, name: 'School A' });
      const result = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });

  describe('update', () => {
    it('should call repository.update', async () => {
      const dto = { name: 'School Updated' } as any;
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.update(1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call repository.remove', async () => {
      mockRepository.remove.mockResolvedValue({ id: 1, name: 'School A' });
      const result = await service.remove(1);
      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });
});
