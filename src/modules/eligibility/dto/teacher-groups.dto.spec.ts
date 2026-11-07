import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateTeacherGroupDto,
  SetGroupMembersDto,
  UpdatePrioritySettingsDto,
  UpdateTeacherGroupDto,
} from './teacher-groups.dto';
import {
  NetworkReferenceDto,
  SchoolReferenceDto,
  SetNetworkInterconnectionsDto,
} from './preferences.dto';

// Validações dos contratos de entrada das rotas da Fase 5 (grupos,
// prioridade e preferências do professor).
describe('TeacherGroups DTOs', () => {
  describe('CreateTeacherGroupDto', () => {
    it('aceita nome e delay válidos (delay 0 é permitido)', async () => {
      const dto = plainToInstance(CreateTeacherGroupDto, {
        name: 'Professores da casa',
        delayMinutes: 0,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejeita nome vazio, nome não textual e delay negativo/não inteiro', async () => {
      const errors = await validate(
        plainToInstance(CreateTeacherGroupDto, {
          name: '',
          delayMinutes: -1,
        }),
      );
      expect(errors.map((error) => error.property).sort()).toEqual([
        'delayMinutes',
        'name',
      ]);

      const nonString = await validate(
        plainToInstance(CreateTeacherGroupDto, {
          name: 123,
          delayMinutes: 1.5,
        }),
      );
      expect(nonString.map((error) => error.property).sort()).toEqual([
        'delayMinutes',
        'name',
      ]);
    });

    it('rejeita nome acima de 80 caracteres', async () => {
      const errors = await validate(
        plainToInstance(CreateTeacherGroupDto, {
          name: 'a'.repeat(81),
          delayMinutes: 10,
        }),
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('UpdateTeacherGroupDto', () => {
    it('aceita objeto vazio (update parcial)', async () => {
      await expect(
        validate(plainToInstance(UpdateTeacherGroupDto, {})),
      ).resolves.toHaveLength(0);
    });

    it('aceita nome e delay válidos', async () => {
      await expect(
        validate(
          plainToInstance(UpdateTeacherGroupDto, {
            name: 'Novo nome',
            delayMinutes: 30,
          }),
        ),
      ).resolves.toHaveLength(0);
    });

    it('rejeita nome não textual, nome longo e delay inválido', async () => {
      const errors = await validate(
        plainToInstance(UpdateTeacherGroupDto, {
          name: 123,
          delayMinutes: -1,
        }),
      );
      expect(errors.map((error) => error.property).sort()).toEqual([
        'delayMinutes',
        'name',
      ]);

      const longName = await validate(
        plainToInstance(UpdateTeacherGroupDto, { name: 'a'.repeat(81) }),
      );
      expect(longName).toHaveLength(1);
      expect(longName[0].property).toBe('name');
    });
  });

  describe('SetGroupMembersDto', () => {
    it('aceita lista de ids inteiros (inclusive vazia)', async () => {
      await expect(
        validate(
          plainToInstance(SetGroupMembersDto, { professorIds: [1, 2, 3] }),
        ),
      ).resolves.toHaveLength(0);
      await expect(
        validate(plainToInstance(SetGroupMembersDto, { professorIds: [] })),
      ).resolves.toHaveLength(0);
    });

    it('rejeita valor que não é array e elementos não inteiros', async () => {
      const notArray = await validate(
        plainToInstance(SetGroupMembersDto, { professorIds: '1,2' }),
      );
      expect(notArray).toHaveLength(1);
      expect(notArray[0].property).toBe('professorIds');

      const mixed = await validate(
        plainToInstance(SetGroupMembersDto, { professorIds: [1, 'x'] }),
      );
      expect(mixed).toHaveLength(1);
      expect(mixed[0].property).toBe('professorIds');
    });

    it('rejeita mais de 500 professores', async () => {
      const errors = await validate(
        plainToInstance(SetGroupMembersDto, {
          professorIds: Array.from({ length: 501 }, (_, index) => index + 1),
        }),
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('professorIds');
      expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
    });
  });

  describe('UpdatePrioritySettingsDto', () => {
    it('aceita objeto vazio, valores válidos e acceptedNetworkIds nulo', async () => {
      await expect(
        validate(plainToInstance(UpdatePrioritySettingsDto, {})),
      ).resolves.toHaveLength(0);
      await expect(
        validate(
          plainToInstance(UpdatePrioritySettingsDto, {
            ungroupedDelayMinutes: 0,
            acceptedNetworkIds: [1, 2],
          }),
        ),
      ).resolves.toHaveLength(0);
      await expect(
        validate(
          plainToInstance(UpdatePrioritySettingsDto, {
            acceptedNetworkIds: null,
          }),
        ),
      ).resolves.toHaveLength(0);
    });

    it('rejeita delay negativo e delay não inteiro', async () => {
      const negative = await validate(
        plainToInstance(UpdatePrioritySettingsDto, {
          ungroupedDelayMinutes: -1,
        }),
      );
      expect(negative).toHaveLength(1);
      expect(negative[0].property).toBe('ungroupedDelayMinutes');

      const nonInt = await validate(
        plainToInstance(UpdatePrioritySettingsDto, {
          ungroupedDelayMinutes: 1.5,
        }),
      );
      expect(nonInt).toHaveLength(1);
      expect(nonInt[0].property).toBe('ungroupedDelayMinutes');
    });

    it('rejeita acceptedNetworkIds que não é array ou tem elemento não inteiro', async () => {
      const notArray = await validate(
        plainToInstance(UpdatePrioritySettingsDto, { acceptedNetworkIds: '1' }),
      );
      expect(notArray).toHaveLength(1);
      expect(notArray[0].property).toBe('acceptedNetworkIds');

      const mixed = await validate(
        plainToInstance(UpdatePrioritySettingsDto, {
          acceptedNetworkIds: [1, 'x'],
        }),
      );
      expect(mixed).toHaveLength(1);
      expect(mixed[0].property).toBe('acceptedNetworkIds');
    });
  });
});

describe('Preferences DTOs', () => {
  describe('NetworkReferenceDto', () => {
    it('aceita networkId inteiro', async () => {
      await expect(
        validate(plainToInstance(NetworkReferenceDto, { networkId: 2 })),
      ).resolves.toHaveLength(0);
    });

    it('rejeita networkId ausente ou não inteiro', async () => {
      const missing = await validate(plainToInstance(NetworkReferenceDto, {}));
      expect(missing).toHaveLength(1);
      expect(missing[0].property).toBe('networkId');

      const stringId = await validate(
        plainToInstance(NetworkReferenceDto, { networkId: '2' }),
      );
      expect(stringId).toHaveLength(1);
      expect(stringId[0].property).toBe('networkId');
    });
  });

  describe('SchoolReferenceDto', () => {
    it('aceita schoolId inteiro', async () => {
      await expect(
        validate(plainToInstance(SchoolReferenceDto, { schoolId: 5 })),
      ).resolves.toHaveLength(0);
    });

    it('rejeita schoolId ausente ou não inteiro', async () => {
      const missing = await validate(plainToInstance(SchoolReferenceDto, {}));
      expect(missing).toHaveLength(1);
      expect(missing[0].property).toBe('schoolId');

      const stringId = await validate(
        plainToInstance(SchoolReferenceDto, { schoolId: '5' }),
      );
      expect(stringId).toHaveLength(1);
      expect(stringId[0].property).toBe('schoolId');
    });
  });

  describe('SetNetworkInterconnectionsDto', () => {
    it('aceita lista de redes inteiras (inclusive vazia)', async () => {
      await expect(
        validate(
          plainToInstance(SetNetworkInterconnectionsDto, {
            allowedNetworkIds: [2, 3],
          }),
        ),
      ).resolves.toHaveLength(0);
      await expect(
        validate(
          plainToInstance(SetNetworkInterconnectionsDto, {
            allowedNetworkIds: [],
          }),
        ),
      ).resolves.toHaveLength(0);
    });

    it('rejeita lista que não é array ou com elemento não inteiro', async () => {
      const notArray = await validate(
        plainToInstance(SetNetworkInterconnectionsDto, {
          allowedNetworkIds: '2',
        }),
      );
      expect(notArray).toHaveLength(1);
      expect(notArray[0].property).toBe('allowedNetworkIds');

      const mixed = await validate(
        plainToInstance(SetNetworkInterconnectionsDto, {
          allowedNetworkIds: [2, 'x'],
        }),
      );
      expect(mixed).toHaveLength(1);
      expect(mixed[0].property).toBe('allowedNetworkIds');
    });
  });
});
