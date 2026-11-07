// Fase 4 (COULD) do Design Doc — indicador estatístico simples, não
// preditivo: proporção histórica de aulas vagas cobertas (available=false)
// sobre o total de aulas vagas do recorte informado. Cortes de nível são
// uma heurística simples e documentada, não um modelo de ML.
export interface CoverageStats {
  totalVagas: number;
  cobertas: number;
  taxaCobertura: number; // 0 a 1; 0 quando totalVagas === 0 (sem dado suficiente)
  nivel: 'baixo' | 'medio' | 'alto'; // nível de RISCO de não-cobertura
}

export const COVERAGE_RISK_THRESHOLDS = {
  BAIXO_RISCO_MIN: 0.7, // taxaCobertura >= 0.7 -> risco baixo
  MEDIO_RISCO_MIN: 0.4, // 0.4 <= taxaCobertura < 0.7 -> risco médio; abaixo disso, alto
} as const;
