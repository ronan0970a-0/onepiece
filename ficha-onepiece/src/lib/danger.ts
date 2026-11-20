import { formatBerry } from './sheet'

/**
 * Nível de perigo de um pirata, pela recompensa. Para mudar os limites da sua mesa, edite só estes números.
 * (Referência da obra: 30 milhões já é "novato perigoso"; 1 bilhão é nível de Yonko.)
 */
export const DANGER_LIMITS = {
  perigoso: 30_000_000,
  muitoPerigoso: 300_000_000,
  extremo: 1_000_000_000,
} as const

export type DangerId = 'none' | 'low' | 'high' | 'severe' | 'extreme'

export interface DangerTier {
  id: DangerId
  label: string
  /** Texto curto com a faixa de recompensa (para a legenda). */
  range: string
}

export const DANGER_TIERS: DangerTier[] = [
  { id: 'extreme', label: 'Ameaça extrema', range: `a partir de ฿ ${formatBerry(DANGER_LIMITS.extremo)}` },
  {
    id: 'severe',
    label: 'Muito perigoso',
    range: `฿ ${formatBerry(DANGER_LIMITS.muitoPerigoso)} a ${formatBerry(DANGER_LIMITS.extremo - 1)}`,
  },
  {
    id: 'high',
    label: 'Perigoso',
    range: `฿ ${formatBerry(DANGER_LIMITS.perigoso)} a ${formatBerry(DANGER_LIMITS.muitoPerigoso - 1)}`,
  },
  { id: 'low', label: 'Baixo', range: `até ฿ ${formatBerry(DANGER_LIMITS.perigoso - 1)}` },
  { id: 'none', label: 'Sem recompensa', range: 'ainda não procurado' },
]

export function dangerOf(bounty: number): DangerTier {
  const id: DangerId =
    bounty >= DANGER_LIMITS.extremo
      ? 'extreme'
      : bounty >= DANGER_LIMITS.muitoPerigoso
        ? 'severe'
        : bounty >= DANGER_LIMITS.perigoso
          ? 'high'
          : bounty > 0
            ? 'low'
            : 'none'
  return DANGER_TIERS.find((t) => t.id === id) as DangerTier
}
