import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createDefaultSheet, normalizeSheet } from '../lib/sheet'
import type { KlassId, NpcKind, SaveStatus, SheetData } from '../types'

/** Descobre (ou cria) a ficha do jogador logado. */
export function useOwnSheetId(userId: string) {
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from('sheets')
      .select('id')
      .eq('owner', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message)
        setSheetId(data?.id ?? null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  const create = useCallback(
    async (klass: KlassId) => {
      setError(null)
      const data = createDefaultSheet(klass)
      const { data: row, error: err } = await supabase
        .from('sheets')
        .insert({ owner: userId, name: data.name, klass, bounty: 0, data })
        .select('id')
        .single()
      if (err) {
        setError(err.message)
        return
      }
      setSheetId(row.id)
    },
    [userId],
  )

  return { sheetId, loading, error, create }
}

/** Tabela que o documento ocupa: fichas dos jogadores ou NPCs/Bosses (mesmo formato de dados). */
export type DocTable = 'sheets' | 'npcs'

/** Campos extras que só os NPCs têm (ficam em colunas, fora do JSON da ficha). */
export interface NpcMeta {
  kind: NpcKind
  revealed: boolean
  byMaster: boolean
}

interface LoadedRow {
  owner: string
  data: unknown
  kind?: NpcKind
  revealed?: boolean
  by_master?: boolean
}

/**
 * Carrega uma ficha (ou NPC), salva sozinha (debounce) e acompanha edições feitas por outra
 * pessoa (ex.: o mestre mexendo no HP) em tempo real.
 */
export function useSheetDoc(sheetId: string, userId: string, table: DocTable = 'sheets') {
  const [data, setDataState] = useState<SheetData | null>(null)
  const [owner, setOwner] = useState<string>('')
  const [meta, setMetaState] = useState<NpcMeta | null>(null)
  const metaRef = useRef<NpcMeta | null>(null)
  const applyMeta = useCallback((m: NpcMeta | null) => {
    metaRef.current = m
    setMetaState(m)
  }, [])
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const dirty = useRef(false)
  const latest = useRef<SheetData | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const d = latest.current
    if (!d || !dirty.current) return
    dirty.current = false
    setStatus('saving')
    const { error: err } = await supabase
      .from(table)
      .update({ data: d, name: d.name, klass: d.klass, bounty: d.bounty })
      .eq('id', sheetId)
    if (err) {
      dirty.current = true
      setStatus('error')
      setError(err.message)
    } else {
      setError(null)
      setStatus(dirty.current ? 'saving' : 'saved')
    }
  }, [sheetId, table])

  // carga inicial
  useEffect(() => {
    let active = true
    const columns: string = table === 'npcs' ? 'owner, data, kind, revealed, by_master' : 'owner, data'
    supabase
      .from(table)
      .select(columns)
      .eq('id', sheetId)
      .single()
      .then(({ data: found, error: err }) => {
        if (!active) return
        const row = found as unknown as LoadedRow | null
        if (err || !row) {
          setError(err?.message ?? (table === 'npcs' ? 'NPC não encontrado.' : 'Ficha não encontrada.'))
          return
        }
        const d = normalizeSheet(row.data)
        latest.current = d
        setOwner(row.owner)
        if (table === 'npcs') {
          applyMeta({ kind: row.kind === 'boss' ? 'boss' : 'npc', revealed: !!row.revealed, byMaster: !!row.by_master })
        }
        setDataState(d)
      })
    return () => {
      active = false
    }
  }, [sheetId, table, applyMeta])

  // tempo real: edição de outra pessoa (mestre) aparece na hora
  useEffect(() => {
    const channel = supabase
      .channel(`${table}:${sheetId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${sheetId}` },
        (payload) => {
          const row = payload.new as { data: unknown; updated_by: string | null; kind?: NpcKind; revealed?: boolean }
          if (table === 'npcs') {
            const m = metaRef.current
            if (m) applyMeta({ ...m, kind: row.kind === 'boss' ? 'boss' : 'npc', revealed: !!row.revealed })
          }
          if (row.updated_by === userId || dirty.current) return
          const d = normalizeSheet(row.data)
          latest.current = d
          setDataState(d)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sheetId, userId, table, applyMeta])

  // salva o que estiver pendente ao sair da tela / fechar a aba
  useEffect(() => {
    const onHide = () => void flush()
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      void flush()
    }
  }, [flush])

  const update = useCallback(
    (fn: (prev: SheetData) => SheetData) => {
      const prev = latest.current
      if (!prev) return
      const next = fn(prev)
      latest.current = next
      dirty.current = true
      setDataState(next)
      setStatus('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 700)
    },
    [flush],
  )

  /** Tipo (NPC/Boss) e "revelado": salvos na hora (não passam pelo debounce). O banco só aceita do mestre. */
  const setNpcMeta = useCallback(
    async (patch: Partial<Pick<NpcMeta, 'kind' | 'revealed'>>) => {
      if (table !== 'npcs') return
      const before = metaRef.current
      if (!before) return
      applyMeta({ ...before, ...patch })
      const { error: err } = await supabase.from('npcs').update(patch).eq('id', sheetId)
      if (err) {
        applyMeta(before)
        setError(err.message)
      } else {
        setError(null)
      }
    },
    [sheetId, table, applyMeta],
  )

  return { data, owner, meta, status, error, update, flush, setNpcMeta }
}
