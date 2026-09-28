import { MonthlyClosingReportsController } from './monthly-closing-reports.controller';
import { MonthlyClosingReportsService } from './monthly-closing-reports.service';

describe('MonthlyClosingReportsController', () => {
  const mockService = {
    generate: jest.fn(),
    findAll: jest.fn(),
    findOneAsOwnerOrManager: jest.fn(),
    review: jest.fn(),
    close: jest.fn(),
    reopen: jest.fn(),
  };

  let controller: MonthlyClosingReportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MonthlyClosingReportsController(mockService as any);
  });

  it('generate forwards the dto and the requester id', async () => {
    const dto = { userId: 10, schoolId: 1, referenceMonth: '2026-03' };
    mockService.generate.mockResolvedValue({ id: 1, status: 'DRAFT' });

    const result = await controller.generate(dto, { user: { id: 2 } });

    expect(mockService.generate).toHaveBeenCalledWith(dto, 2);
    expect(result).toEqual({ id: 1, status: 'DRAFT' });
  });

  it('findAll forwards converted filters when all query params are present', async () => {
    mockService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('10', '1', '2026-03');

    expect(mockService.findAll).toHaveBeenCalledWith({
      userId: 10,
      schoolId: 1,
      referenceMonth: '2026-03',
    });
    expect(result).toEqual([]);
  });

  it('findAll forwards undefined filters when no query params are present', async () => {
    mockService.findAll.mockResolvedValue([]);

    await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalledWith({
      userId: undefined,
      schoolId: undefined,
      referenceMonth: undefined,
    });
  });

  it('findOne checks ownership/management with the requester id', async () => {
    mockService.findOneAsOwnerOrManager.mockResolvedValue({ id: 3 });

    const result = await controller.findOne('3', { user: { id: 2 } });

    expect(mockService.findOneAsOwnerOrManager).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3 });
  });

  it('review forwards the id and the requester id', async () => {
    mockService.review.mockResolvedValue({ id: 3, status: 'REVIEWED' });

    const result = await controller.review('3', { user: { id: 2 } });

    expect(mockService.review).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3, status: 'REVIEWED' });
  });

  it('close forwards the id and the requester id', async () => {
    mockService.close.mockResolvedValue({ id: 3, status: 'CLOSED' });

    const result = await controller.close('3', { user: { id: 2 } });

    expect(mockService.close).toHaveBeenCalledWith(3, 2);
    expect(result).toEqual({ id: 3, status: 'CLOSED' });
  });

  it('reopen forwards the id, the justification and the requester id', async () => {
    mockService.reopen.mockResolvedValue({ id: 3, status: 'DRAFT' });

    const result = await controller.reopen(
      '3',
      { justification: 'motivo valido da reabertura' },
      { user: { id: 2 } },
    );

    expect(mockService.reopen).toHaveBeenCalledWith(
      3,
      'motivo valido da reabertura',
      2,
    );
    expect(result).toEqual({ id: 3, status: 'DRAFT' });
  });
});
