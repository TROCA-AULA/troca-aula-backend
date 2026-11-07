import { NetworkCoordinatorsController } from './network-coordinators.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('NetworkCoordinatorsController', () => {
  const mockService = {
    findAll: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new NetworkCoordinatorsController(mockService as never);

  beforeEach(() => jest.clearAllMocks());

  it('a rota inteira é só do MASTER', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, NetworkCoordinatorsController),
    ).toEqual(['MASTER']);
  });

  it('findAll repassa ao service', async () => {
    mockService.findAll.mockResolvedValue([]);
    await expect(controller.findAll()).resolves.toEqual([]);
  });

  it('create usa o MASTER logado como quem aprovou', async () => {
    mockService.create.mockResolvedValue({ userId: 7 });
    await controller.create({ userId: 7, networkId: 2 }, { user: { id: 1 } });
    expect(mockService.create).toHaveBeenCalledWith(7, 2, 1);
  });

  it('remove repassa os ids da rota', async () => {
    mockService.remove.mockResolvedValue({ userId: 7 });
    await controller.remove(7, 2);
    expect(mockService.remove).toHaveBeenCalledWith(7, 2);
  });
});
