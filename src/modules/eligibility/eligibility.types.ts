// Fase 5 — motor de elegibilidade geográfica (Design Doc, Seção 9),
// modelo de GRUPOS por escola.

export type IneligibilityReason = 'EXCLUDED' | 'PRIORITY_WINDOW' | 'NETWORK';

export interface EligibilityVerdict {
  visible: boolean;
  /** Por que não está visível (quando visible=false). */
  reason?: IneligibilityReason;
  /** Nome do grupo do professor naquela escola (quando visível por grupo). */
  groupName?: string;
  /** Mensagem pronta para o usuário (nas duas direções). */
  message?: string;
}

export interface EligibilityClassInput {
  schoolId: number;
  createdAt?: Date | string | null;
}
