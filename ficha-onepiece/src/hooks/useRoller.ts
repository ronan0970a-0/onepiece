import { useCallback, useState } from 'react'
import { rollDice } from '../lib/dice'
import type { RollRow } from '../types'
import { useRolls } from './useRolls'

export interface Roller {
  rolls: RollRow[]
  loading: boolean
  busy: boolean
  last: RollRow | null
  error: string | null
  roll: (label: string, count: number, sides: number, modifier: number) => Promise<void>
}

/** Junta histórico em tempo real + ação de rolar. sheetId = null → rolagem do Mestre. */
export function useRoller(sheetId: string | null): Roller {
  const { rolls, loading, push } = useRolls()
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<RollRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roll = useCallback(
    async (label: string, count: number, sides: number, modifier: number) => {
      setBusy(true)
      setError(null)
      try {
        const r = await rollDice({ sheetId, label, count, sides, modifier })
        push(r)
        setLast(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível rolar o dado.')
      } finally {
        setBusy(false)
      }
    },
    [sheetId, push],
  )

  return { rolls, loading, busy, last, error, roll }
}
