import { Test, TestingModule } from '@nestjs/testing';
import { NetworksService } from './networks.service';
import { NetworksRepository } from './networks.repository';

describe('NetworksService', () => {
  let service: NetworksService;
  let repository: jest.Mocked<NetworksRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworksService,
        {
          provide: NetworksRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NetworksService>(NetworksService);
    repository = module.get(NetworksRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('delegates to repository.create', async () => {
      const dto = { name: 'Rede Municipal X' };
      const created = { id: 1, ...dto };
      repository.create.mockResolvedValue(created as any);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('delegates to repository.findAll', async () => {
      const networks = [{ id: 1, name: 'Rede X' }];
      repository.findAll.mockResolvedValue(networks as any);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual(networks);
    });
  });

  describe('findOne', () => {
    it('delegates to repository.findOne', async () => {
      const network = { id: 1, name: 'Rede X' };
      repository.findOne.mockResolvedValue(network as any);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(network);
    });
  });

  describe('update', () => {
    it('delegates to repository.update', async () => {
      const dto = { name: 'Rede Renomeada' };
      const updated = { id: 1, ...dto };
      repository.update.mockResolvedValue(updated as any);

      const result = await service.update(1, dto);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });
});
