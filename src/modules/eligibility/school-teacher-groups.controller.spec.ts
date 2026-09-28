import { NetworkInterconnectionsController } from './network-interconnections.controller';
import { ProfessorPreferencesController } from './professor-preferences.controller';
import { SchoolTeacherGroupsController } from './school-teacher-groups.controller';

// Controllers finos: apenas repassam os parâmetros (inclusive o id do
// usuário autenticado vindo de req.user) para o service correspondente.
describe('SchoolTeacherGroupsController (Fase 5 — grupos por escola)', () => {
  const mockService = {
    get: jest.fn(),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    removeGroup: jest.fn(),
    setMembers: jest.fn(),
    updateSettings: jest.fn(),
  };
  const controller = new SchoolTeacherGroupsController(mockService as never);
  const req = { user: { id: 1 } };

  beforeEach(() => jest.clearAllMocks());

  it('get repassa o id da escola e do solicitante', async () => {
    mockService.get.mockResolvedValue({ schoolId: 5 });

    const result = await controller.get(5, req);

    expect(mockService.get).toHaveBeenCalledWith(5, 1);
    expect(result).toEqual({ schoolId: 5 });
  });

  it('create repassa dto e solicitante', async () => {
    const dto = { name: 'Grupo', delayMinutes: 10 };
    mockService.createGroup.mockResolvedValue({ schoolId: 5 });

    const result = await controller.create(5, dto, req);

    expect(mockService.createGroup).toHaveBeenCalledWith(5, dto, 1);
    expect(result).toEqual({ schoolId: 5 });
  });

  it('update repassa escola, grupo, dto e solicitante', async () => {
    const dto = { delayMinutes: 20 };
    mockService.updateGroup.mockResolvedValue({ schoolId: 5 });

    await controller.update(5, 9, dto, req);

    expect(mockService.updateGroup).toHaveBeenCalledWith(5, 9, dto, 1);
  });

  it('remove repassa escola, grupo e solicitante', async () => {
    mockService.removeGroup.mockResolvedValue({ schoolId: 5 });

    await controller.remove(5, 9, req);

    expect(mockService.removeGroup).toHaveBeenCalledWith(5, 9, 1);
  });

  it('setMembers desempacota professorIds do dto', async () => {
    mockService.setMembers.mockResolvedValue({ schoolId: 5 });

    await controller.setMembers(5, 9, { professorIds: [3, 4] }, req);

    expect(mockService.setMembers).toHaveBeenCalledWith(5, 9, [3, 4], 1);
  });

  it('updateSettings repassa dto e solicitante', async () => {
    const dto = { ungroupedDelayMinutes: 15 };
    mockService.updateSettings.mockResolvedValue({ schoolId: 5 });

    await controller.updateSettings(5, dto, req);

    expect(mockService.updateSettings).toHaveBeenCalledWith(5, dto, 1);
  });
});

describe('ProfessorPreferencesController (Fase 5 — preferências do professor)', () => {
  const mockService = {
    getMine: jest.fn(),
    addNetworkInterest: jest.fn(),
    removeNetworkInterest: jest.fn(),
    addSchoolExclusion: jest.fn(),
    removeSchoolExclusion: jest.fn(),
  };
  const controller = new ProfessorPreferencesController(mockService as never);
  const req = { user: { id: 1 } };

  beforeEach(() => jest.clearAllMocks());

  it('getMine usa apenas o solicitante autenticado', async () => {
    mockService.getMine.mockResolvedValue({ networkInterests: [] });

    const result = await controller.getMine(req);

    expect(mockService.getMine).toHaveBeenCalledWith(1);
    expect(result).toEqual({ networkInterests: [] });
  });

  it('addNetworkInterest repassa o networkId do dto', async () => {
    mockService.addNetworkInterest.mockResolvedValue({ networkId: 2 });

    await controller.addNetworkInterest({ networkId: 2 }, req);

    expect(mockService.addNetworkInterest).toHaveBeenCalledWith(1, 2);
  });

  it('removeNetworkInterest repassa o parâmetro da rota', async () => {
    mockService.removeNetworkInterest.mockResolvedValue({ networkId: 2 });

    await controller.removeNetworkInterest(2, req);

    expect(mockService.removeNetworkInterest).toHaveBeenCalledWith(1, 2);
  });

  it('addSchoolExclusion repassa o schoolId do dto', async () => {
    mockService.addSchoolExclusion.mockResolvedValue({ schoolId: 3 });

    await controller.addSchoolExclusion({ schoolId: 3 }, req);

    expect(mockService.addSchoolExclusion).toHaveBeenCalledWith(1, 3);
  });

  it('removeSchoolExclusion repassa o parâmetro da rota', async () => {
    mockService.removeSchoolExclusion.mockResolvedValue({ schoolId: 3 });

    await controller.removeSchoolExclusion(3, req);

    expect(mockService.removeSchoolExclusion).toHaveBeenCalledWith(1, 3);
  });
});

describe('NetworkInterconnectionsController (Fase 5 — interconexões)', () => {
  const mockService = {
    get: jest.fn(),
    replace: jest.fn(),
  };
  const controller = new NetworkInterconnectionsController(
    mockService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('get repassa o id da rede', async () => {
    mockService.get.mockResolvedValue({ networkId: 1, interconnections: [] });

    const result = await controller.get(1);

    expect(mockService.get).toHaveBeenCalledWith(1);
    expect(result).toEqual({ networkId: 1, interconnections: [] });
  });

  it('replace repassa o id da rede e o dto', async () => {
    const dto = { allowedNetworkIds: [2] };
    mockService.replace.mockResolvedValue({
      networkId: 1,
      interconnections: [],
    });

    await controller.replace(1, dto);

    expect(mockService.replace).toHaveBeenCalledWith(1, dto);
  });
});
