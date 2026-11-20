import { useCallback, useEffect, useState } from 'react'
import { normalizeSheet } from '../lib/sheet'
import { supabase } from '../lib/supabase'
import type { RollRow, SheetRow } from '../types'

const LIMIT = 300

/**
 * Histórico de dados em tempo real. As regras (RLS) do banco decidem o que cada um vê:
 * o mestre recebe as rolagens de todos, o jogador só as próprias.
 */
export function useRolls() {
  const [rolls, setRolls] = useState<RollRow[]>([])
  const [loading, setLoading] = useState(true)

  const push = useCallback((r: RollRow) => {
    setRolls((prev) => (prev.some((x) => x.id === r.id) ? prev : [r, ...prev].slice(0, LIMIT)))
  }, [])

  useEffect(() => {
    let active = true
    supabase
      .from('rolls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data }) => {
        if (!active) return
        setRolls((prev) => {
          const seen = new Set(prev.map((r) => r.id))
          return [...prev, ...((data as RollRow[] | null) ?? []).filter((r) => !seen.has(r.id))]
            .sort((a, b) => b.id - a.id)
            .slice(0, LIMIT)
        })
        setLoading(false)
      })

    const channel = supabase
      .channel(`rolls-feed-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls' }, (payload) =>
        push(payload.new as RollRow),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [push])

  return { rolls, loading, push }
}

/** Passa a ficha pela mesma limpeza usada ao abrir (ex.: link de foto inválido gravado por outro jogador é descartado). */
const cleanRow = (r: SheetRow): SheetRow => ({ ...r, data: normalizeSheet(r.data) })

/** Lista de todas as fichas (somente o mestre enxerga mais de uma). */
export function useAllSheets() {
  const [sheets, setSheets] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('sheets')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setSheets(((data as SheetRow[] | null) ?? []).map(cleanRow))
        setLoading(false)
      })

    const channel = supabase
      .channel(`sheets-feed-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sheets' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id
          setSheets((prev) => prev.filter((s) => s.id !== id))
          return
        }
        const row = cleanRow(payload.new as SheetRow)
        setSheets((prev) => {
          const rest = prev.filter((s) => s.id !== row.id)
          return [row, ...rest]
        })
      })
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return { sheets, loading }
}
