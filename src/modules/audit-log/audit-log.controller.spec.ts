import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogController', () => {
  const mockService = {
    findByEntity: jest.fn(),
    findByNetwork: jest.fn(),
  };

  let controller: AuditLogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController(mockService as any);
  });

  it('findByNetwork converts the networkId param', async () => {
    mockService.findByNetwork.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findByNetwork('7');

    expect(mockService.findByNetwork).toHaveBeenCalledWith(7);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('findByEntity forwards the entity type and the converted entity id', async () => {
    mockService.findByEntity.mockResolvedValue([{ id: 2 }]);

    const result = await controller.findByEntity('TeacherWorkloadRecords', '9');

    expect(mockService.findByEntity).toHaveBeenCalledWith(
      'TeacherWorkloadRecords',
      9,
    );
    expect(result).toEqual([{ id: 2 }]);
  });
});
