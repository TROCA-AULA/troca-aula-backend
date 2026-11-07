import { TeacherWorkloadRecordsController } from './teacher-workload-records.controller';
import { TeacherWorkloadRecordsService } from './teacher-workload-records.service';

describe('TeacherWorkloadRecordsController', () => {
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOwn: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: TeacherWorkloadRecordsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TeacherWorkloadRecordsController(mockService as any);
  });

  it('create forwards the dto and the requester id', async () => {
    const dto = {
      userId: 10,
      schoolId: 1,
      workloadTypeId: 4,
      hours: 5,
      validFrom: new Date('2026-01-01'),
    };
    mockService.create.mockResolvedValue({ id: 1, ...dto });

    const result = await controller.create(dto, { user: { id: 2 } });

    expect(mockService.create).toHaveBeenCalledWith(dto, 2);
    expect(result).toEqual({ id: 1, ...dto });
  });

  it('findAll converts the schoolId query param', async () => {
    mockService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('1');

    expect(mockService.findAll).toHaveBeenCalledWith({ schoolId: 1 });
    expect(result).toEqual([]);
  });

  it('findOwn uses only the authenticated user id', async () => {
    mockService.findOwn.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findOwn({ user: { id: 2 } });

    expect(mockService.findOwn).toHaveBeenCalledWith(2);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('findOne converts the id param', async () => {
    mockService.findOne.mockResolvedValue({ id: 3 });

    const result = await controller.findOne('3');

    expect(mockService.findOne).toHaveBeenCalledWith(3);
    expect(result).toEqual({ id: 3 });
  });

  it('update forwards the converted id, the dto and the requester id', async () => {
    const dto = { hours: 6 };
    mockService.update.mockResolvedValue({ id: 3, hours: '6' });

    const result = await controller.update('3', dto, {
      user: { id: 2 },
    });

    expect(mockService.update).toHaveBeenCalledWith(3, dto, 2);
    expect(result).toEqual({ id: 3, hours: '6' });
  });

  it('remove forwards the converted id and the requester id', async () => {
    mockService.remove.mockResolvedValue({ id: 3 });

    const result = await controller.remove('3', { user: { id: 2 } });

    expect(mockService.remove).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3 });
  });
});
