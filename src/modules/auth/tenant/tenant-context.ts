export const ProfileName = {
  DIRETOR: 'DIRETOR',
  AUXILIAR_ADMIN: 'AUXILIAR_ADMIN',
  PROFESSOR: 'PROFESSOR',
  MASTER: 'MASTER',
  COORDENADOR_MUNICIPAL: 'COORDENADOR_MUNICIPAL',
} as const;

// Ids fixos da tabela Profiles (migrations 0002 e 0008).
export const PROFILE_IDS: Record<ProfileNameValue, number> = {
  DIRETOR: 1,
  AUXILIAR_ADMIN: 2,
  PROFESSOR: 3,
  MASTER: 4,
  COORDENADOR_MUNICIPAL: 5,
};

// Hierarquia usada para impedir que alguém conceda um perfil ACIMA do seu
// (defeito D22: um DIRETOR conseguia se dar o perfil MASTER).
export const PROFILE_RANK: Record<string, number> = {
  PROFESSOR: 1,
  AUXILIAR_ADMIN: 2,
  DIRETOR: 3,
  COORDENADOR_MUNICIPAL: 4,
  MASTER: 5,
};

export type ProfileNameValue = (typeof ProfileName)[keyof typeof ProfileName];

// Perfis com poder de gestão sobre uma escola (aprovar/rejeitar candidaturas,
// criar/editar aulas, atribuir vínculos). MASTER também está aqui porque tem
// poder de gestão sobre qualquer escola (bypass global, ver TenantContext.isMaster).
//
// COORDENADOR_MUNICIPAL entra como gestor de TODAS as escolas das redes em
// que tem vínculo (UserNetworkLinks): o TenantContextService gera um vínculo
// "virtual" com esse perfil para cada escola dessas redes.
export const MANAGER_PROFILES: ProfileNameValue[] = [
  ProfileName.MASTER,
  ProfileName.COORDENADOR_MUNICIPAL,
  ProfileName.DIRETOR,
  ProfileName.AUXILIAR_ADMIN,
];

export interface SchoolLink {
  schoolId: number;
  profileId: number;
  profileName: string;
  approvedAt: Date | null;
  /** Rede de ensino da escola (Schools.networkId) — resolve sem 2ª query. */
  networkId: number | null;
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
  // Redes que o usuário coordena (COORDENADOR_MUNICIPAL). Vazio para os
  // demais perfis.
  coordinatedNetworkIds?: number[];
}
