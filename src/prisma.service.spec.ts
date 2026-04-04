import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call $connect on onModuleInit', async () => {
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should call $disconnect on onModuleDestroy', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  describe('middleware', () => {
    it('should handle soft delete for supported models on findUnique', async () => {
        // @ts-ignore
        const next = jest.fn().mockImplementation((params) => params);
        // @ts-ignore
        const middleware = service['$use'].mock.calls[0][0];

        const params = {
            model: 'Users',
            action: 'findUnique',
            args: { where: { id: 1 } }
        };

        const result = await middleware(params, next);
        expect(result.args.where.deletedAt).toBeNull();
    });

    it('should handle soft delete for delete action', async () => {
        // @ts-ignore
        const next = jest.fn().mockImplementation((params) => params);
        // @ts-ignore
        const middleware = service['$use'].mock.calls[0][0];

        const params = {
            model: 'Users',
            action: 'delete',
            args: { where: { id: 1 } }
        };

        const result = await middleware(params, next);
        expect(result.action).toBe('update');
        expect(result.args.data.deletedAt).toBeInstanceOf(Date);
    });

    it('should handle soft delete for deleteMany action', async () => {
        // @ts-ignore
        const next = jest.fn().mockImplementation((params) => params);
        // @ts-ignore
        const middleware = service['$use'].mock.calls[0][0];

        const params = {
            model: 'Users',
            action: 'deleteMany',
            args: { where: { id: 1 } }
        };

        const result = await middleware(params, next);
        expect(result.action).toBe('updateMany');
        expect(result.args.data.deletedAt).toBeInstanceOf(Date);
    });

    it('should not modify params if model is not in soft delete list', async () => {
        // @ts-ignore
        const next = jest.fn().mockImplementation((params) => params);
        // @ts-ignore
        const middleware = service['$use'].mock.calls[0][0];

        const params = {
            model: 'OtherModel',
            action: 'delete',
            args: { where: { id: 1 } }
        };

        const result = await middleware(params, next);
        expect(result.action).toBe('delete');
        expect(result.args.where.deletedAt).toBeUndefined();
    });
  });
});

// Mock PrismaClient since it can't be easily instantiated in tests without a DB
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $use = jest.fn();
      $connect = jest.fn();
      $disconnect = jest.fn();
    },
  };
});
