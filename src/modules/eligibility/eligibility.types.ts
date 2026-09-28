// Fase 5 — motor de elegibilidade geográfica (Design Doc, Seção 9).

export const TIER_SCOPES = [
  'ESCOLA',
  'REDE',
  'REDE_INTERCONECTADA_INTERESSADA',
  'GERAL',
] as const;

export type TierScope = (typeof TIER_SCOPES)[number];

export function isTierScope(value: string): value is TierScope {
  return (TIER_SCOPES as readonly string[]).includes(value);
}

export type IneligibilityReason = 'EXCLUDED' | 'PRIORITY_WINDOW';

export interface EligibilityVerdict {
  visible: boolean;
  /** Por que não está visível (quando visible=false). */
  reason?: IneligibilityReason;
  /** Nível de prioridade pelo qual a vaga está visível. */
  tierScope?: TierScope;
  /** Mensagem pronta para o usuário (nas duas direções). */
  message?: string;
}

export interface EligibilityClassInput {
  schoolId: number;
  createdAt?: Date | string | null;
}
