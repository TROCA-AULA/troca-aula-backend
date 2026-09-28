import { WorkloadPoliciesController } from './workload-policies.controller';
import { WorkloadPoliciesService } from './workload-policies.service';

describe('WorkloadPoliciesController', () => {
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let controller: WorkloadPoliciesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WorkloadPoliciesController(mockService as any);
  });

  it('create forwards the dto', async () => {
    const dto = { networkId: 1, workloadTypeId: 4, maxHoursPerWeek: 10 };
    mockService.create.mockResolvedValue({ id: 1, ...dto });

    const result = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1, ...dto });
  });

  it('findAll converts a provided networkId', async () => {
    mockService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('2');

    expect(mockService.findAll).toHaveBeenCalledWith(2);
    expect(result).toEqual([]);
  });

  it('findAll passes undefined when no networkId is provided', async () => {
    mockService.findAll.mockResolvedValue([]);

    await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalledWith(undefined);
  });

  it('findOne converts the id param', async () => {
    mockService.findOne.mockResolvedValue({ id: 3 });

    const result = await controller.findOne('3');

    expect(mockService.findOne).toHaveBeenCalledWith(3);
    expect(result).toEqual({ id: 3 });
  });

  it('update forwards the converted id and the dto', async () => {
    const dto = { maxHoursPerWeek: 12 };
    mockService.update.mockResolvedValue({ id: 3, ...dto });

    const result = await controller.update('3', dto);

    expect(mockService.update).toHaveBeenCalledWith(3, dto);
    expect(result).toEqual({ id: 3, ...dto });
  });
});
