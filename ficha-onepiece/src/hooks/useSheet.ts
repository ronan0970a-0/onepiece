import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createDefaultSheet, normalizeSheet } from '../lib/sheet'
import type { KlassId, SaveStatus, SheetData } from '../types'

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

/**
 * Carrega uma ficha, salva sozinha (debounce) e acompanha edições feitas por outra
 * pessoa (ex.: o mestre mexendo no HP) em tempo real.
 */
export function useSheetDoc(sheetId: string, userId: string) {
  const [data, setDataState] = useState<SheetData | null>(null)
  const [owner, setOwner] = useState<string>('')
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
      .from('sheets')
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
  }, [sheetId])

  // carga inicial
  useEffect(() => {
    let active = true
    supabase
      .from('sheets')
      .select('owner, data')
      .eq('id', sheetId)
      .single()
      .then(({ data: row, error: err }) => {
        if (!active) return
        if (err || !row) {
          setError(err?.message ?? 'Ficha não encontrada.')
          return
        }
        const d = normalizeSheet(row.data)
        latest.current = d
        setOwner(row.owner)
        setDataState(d)
      })
    return () => {
      active = false
    }
  }, [sheetId])

  // tempo real: edição de outra pessoa (mestre) aparece na hora
  useEffect(() => {
    const channel = supabase
      .channel(`sheet:${sheetId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sheets', filter: `id=eq.${sheetId}` },
        (payload) => {
          const row = payload.new as { data: unknown; updated_by: string | null }
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
  }, [sheetId, userId])

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

  return { data, owner, status, error, update, flush }
}
