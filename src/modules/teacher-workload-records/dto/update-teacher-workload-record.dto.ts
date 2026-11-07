import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTeacherWorkloadRecordDto } from './create-teacher-workload-record.dto';

// userId/schoolId não são editáveis (identidade do registro) — para mudar
// o professor ou a escola de um lançamento, cria-se um novo registro e
// encerra-se o antigo (validTo), preservando o histórico para auditoria.
export class UpdateTeacherWorkloadRecordDto extends PartialType(
  OmitType(CreateTeacherWorkloadRecordDto, ['userId', 'schoolId'] as const),
) {}
