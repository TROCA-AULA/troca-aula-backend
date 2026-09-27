export const ProfileName = {
  DIRETOR: 'DIRETOR',
  AUXILIAR_ADMIN: 'AUXILIAR_ADMIN',
  PROFESSOR: 'PROFESSOR',
  MASTER: 'MASTER',
} as const;

export type ProfileNameValue = (typeof ProfileName)[keyof typeof ProfileName];

// Perfis com poder de gestão sobre uma escola (aprovar/rejeitar candidaturas,
// criar/editar aulas, atribuir vínculos). MASTER também está aqui porque tem
// poder de gestão sobre qualquer escola (bypass global, ver TenantContext.isMaster).
export const MANAGER_PROFILES: ProfileNameValue[] = [
  ProfileName.MASTER,
  ProfileName.DIRETOR,
  ProfileName.AUXILIAR_ADMIN,
];

export interface SchoolLink {
  schoolId: number;
  profileId: number;
  profileName: string;
  approvedAt: Date | null;
}

// Contexto de tenant resolvido para um usuário autenticado: apenas vínculos
// APROVADOS (approvedAt != null) entram aqui — um vínculo criado via
// assign-profile mas ainda não aprovado não concede nenhum acesso.
export interface TenantContext {
  userId: number;
  isMaster: boolean;
  links: SchoolLink[];
  // Matéria do usuário (só professores têm) - usado para filtrar a
  // listagem de aulas vagas pela disciplina que o professor pode lecionar
  // (ver ClassesService.findAll). null para quem não tem subjectId.
  subjectId: number | null;
}
