import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogController', () => {
  const mockService = {
    findByEntity: jest.fn(),
    findByNetwork: jest.fn(),
  };

  const mockTenant = { assertCanManageNetwork: jest.fn() };
  const req = { user: { id: 3 } };

  let controller: AuditLogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController(mockService as any, mockTenant as any);
  });

  it('findByNetwork confere a rede de quem pede e converte o networkId', async () => {
    mockService.findByNetwork.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findByNetwork('7', req);

    expect(mockTenant.assertCanManageNetwork).toHaveBeenCalledWith(3, 7);
    expect(mockService.findByNetwork).toHaveBeenCalledWith(7);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('findByNetwork não lê a auditoria quando a rede não é de quem pede', async () => {
    mockTenant.assertCanManageNetwork.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(controller.findByNetwork('8', req)).rejects.toThrow(
      'Forbidden',
    );
    expect(mockService.findByNetwork).not.toHaveBeenCalled();
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
