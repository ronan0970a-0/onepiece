import { useCallback, useEffect, useState } from 'react'
import { friendlyDbError } from '../lib/errors'
import { createDefaultNpc, normalizeSheet, photoLink } from '../lib/sheet'
import { supabase } from '../lib/supabase'
import type { NpcKind, NpcRow, RevealedNpc, WantedEntry } from '../types'

const asRow = (r: NpcRow): NpcRow => ({ ...r, data: normalizeSheet(r.data), bounty: Number(r.bounty) || 0 })

/**
 * NPCs visíveis para quem está logado (o banco decide): o jogador recebe só os seus; o mestre recebe todos.
 * Atualiza em tempo real.
 */
export function useNpcList(userId: string) {
  const [npcs, setNpcs] = useState<NpcRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('npcs')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(friendlyDbError(err.message))
        else setNpcs(((data as unknown as NpcRow[] | null) ?? []).map(asRow))
        setLoading(false)
      })

    const channel = supabase
      .channel(`npcs-feed-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'npcs' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id
          setNpcs((prev) => prev.filter((n) => n.id !== id))
          return
        }
        const row = asRow(payload.new as NpcRow)
        setNpcs((prev) => (prev.some((n) => n.id === row.id) ? prev.map((n) => (n.id === row.id ? row : n)) : [row, ...prev]))
      })
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  /** Cria um NPC (ou Boss, se for o mestre) e devolve o id para abrir em seguida. */
  const create = useCallback(
    async (kind: NpcKind): Promise<string | null> => {
      setError(null)
      const data = createDefaultNpc()
      const { data: created, error: err } = await supabase
        .from('npcs')
        .insert({ owner: userId, kind, name: '', klass: data.klass, bounty: 0, data })
        .select('*')
        .single()
      if (err || !created) {
        setError(friendlyDbError(err?.message ?? 'Não foi possível criar o NPC.'))
        return null
      }
      const row = asRow(created as unknown as NpcRow)
      setNpcs((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
      return row.id
    },
    [userId],
  )

  return { npcs, loading, error, create }
}

/** Chama uma função do banco (RPC) que devolve uma lista, recarrega ao voltar para a aba e sob demanda. */
function useRpcList<T>(fn: 'wanted_board' | 'revealed_npcs', clean: (row: T) => T) {
  const [list, setList] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.rpc(fn)
    if (err) {
      setError(friendlyDbError(err.message))
      setList([])
    } else {
      setError(null)
      setList(((data as unknown as T[] | null) ?? []).map(clean))
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn])

  useEffect(() => {
    void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { list, loading, error, refresh }
}

// os dados vêm do banco e podem ter sido gravados por outro jogador: limpa o link da foto e os números
const cleanWanted = (r: WantedEntry): WantedEntry => ({ ...r, bounty: Number(r.bounty) || 0, photo_url: photoLink(r.photo_url) })
const cleanRevealed = (r: RevealedNpc): RevealedNpc => ({ ...r, bounty: Number(r.bounty) || 0, photo_url: photoLink(r.photo_url) })

/** Quadro de Procurados (só a Marinha e o mestre conseguem; os outros recebem um erro do banco). */
export const useWantedBoard = () => useRpcList<WantedEntry>('wanted_board', cleanWanted)

/** NPCs que o mestre revelou aos jogadores (só identidade). */
export const useRevealedNpcs = () => useRpcList<RevealedNpc>('revealed_npcs', cleanRevealed)
