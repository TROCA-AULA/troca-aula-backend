import { isNull, SQL } from 'drizzle-orm';
import { classes, schools, subjects, users } from './schema';

// PrismaService (removido nesta migração) tratava soft delete
// via middleware global para Users/Subjects/Schools/Classes: filtrava
// `deletedAt: null` em find* e reescrevia delete/deleteMany em update com
// `deletedAt: new Date()`. Drizzle não tem middleware equivalente, então cada
// repository chama os helpers abaixo explicitamente — ver ADR-002 no Design
// Doc: a troca por Drizzle foi motivada por "menos mágica implícita", então
// preferimos este código repetido e visível a tentar recriar um middleware
// genérico.
export const SOFT_DELETE_TABLES = [users, subjects, schools, classes] as const;

export function notDeleted(table: (typeof SOFT_DELETE_TABLES)[number]): SQL {
  return isNull(table.deletedAt);
}
