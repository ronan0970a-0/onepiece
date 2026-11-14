import { supabase } from './supabase'
import type { RollRow } from '../types'

export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const

export interface RollArgs {
  /** null = rolagem do Mestre (sem ficha) */
  sheetId: string | null
  label: string
  count: number
  sides: number
  modifier: number
}

/** O sorteio acontece no servidor (função roll_dice) e o resultado entra no histórico. */
export async function rollDice(a: RollArgs): Promise<RollRow> {
  const { data, error } = await supabase.rpc('roll_dice', {
    p_sheet: a.sheetId,
    p_label: a.label,
    p_count: a.count,
    p_sides: a.sides,
    p_modifier: a.modifier,
  })
  if (error) throw new Error(error.message)
  return data as RollRow
}

export function formatExpr(r: Pick<RollRow, 'dice_count' | 'dice_sides' | 'modifier'>): string {
  const mod = r.modifier === 0 ? '' : r.modifier > 0 ? `+${r.modifier}` : `${r.modifier}`
  return `${r.dice_count}d${r.dice_sides}${mod}`
}

/** Crítico / falha crítica só fazem sentido em 1d20. */
export function critOf(r: RollRow): 'crit' | 'fumble' | null {
  if (r.dice_sides !== 20 || r.dice_count !== 1) return null
  if (r.results[0] === 20) return 'crit'
  if (r.results[0] === 1) return 'fumble'
  return null
}
