import { EnrollmentRequestsController } from './enrollment-requests.controller';
import { EnrollmentRequestsService } from './enrollment-requests.service';

describe('EnrollmentRequestsController', () => {
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getSubstitutionLimitStatus: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  let controller: EnrollmentRequestsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EnrollmentRequestsController(mockService as any);
  });

  it('request forwards the class id and the authenticated user', async () => {
    mockService.create.mockResolvedValue({ id: 1, status: 'PENDING' });

    const result = await controller.request(5, { user: { id: 2 } });

    expect(mockService.create).toHaveBeenCalledWith(5, 2);
    expect(result).toEqual({ id: 1, status: 'PENDING' });
  });

  it('findAll forwards the query and the authenticated user', async () => {
    const query = { status: 'PENDING' } as any;
    mockService.findAll.mockResolvedValue([]);

    const result = await controller.findAll(query, { user: { id: 2 } });

    expect(mockService.findAll).toHaveBeenCalledWith(query, 2);
    expect(result).toEqual([]);
  });

  it('getSubstitutionLimitStatus forwards professor and requester ids', async () => {
    mockService.getSubstitutionLimitStatus.mockResolvedValue({
      current: 1,
      limit: 4,
    });

    const result = await controller.getSubstitutionLimitStatus(7, {
      user: { id: 2 },
    });

    expect(mockService.getSubstitutionLimitStatus).toHaveBeenCalledWith(7, 2);
    expect(result).toEqual({ current: 1, limit: 4 });
  });

  it('findOne forwards the id', async () => {
    mockService.findOne.mockResolvedValue({ id: 3 });

    const result = await controller.findOne(3);

    expect(mockService.findOne).toHaveBeenCalledWith(3);
    expect(result).toEqual({ id: 3 });
  });

  it('approve forwards the id and the requester id', async () => {
    mockService.approve.mockResolvedValue({ id: 3, status: 'APPROVED' });

    const result = await controller.approve(3, { user: { id: 2 } });

    expect(mockService.approve).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3, status: 'APPROVED' });
  });

  it('reject forwards the id and the requester id', async () => {
    mockService.reject.mockResolvedValue({ id: 3, status: 'REJECTED' });

    const result = await controller.reject(3, { user: { id: 2 } });

    expect(mockService.reject).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3, status: 'REJECTED' });
  });

  it('cancel forwards the id and the requester id', async () => {
    mockService.cancel.mockResolvedValue({ id: 3, status: 'CANCELLED' });

    const result = await controller.cancel(3, { user: { id: 2 } });

    expect(mockService.cancel).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3, status: 'CANCELLED' });
  });
});
