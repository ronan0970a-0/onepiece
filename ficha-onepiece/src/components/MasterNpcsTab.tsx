import { useMemo, useState } from 'react'
import { useNpcList } from '../hooks/useNpcs'
import { useAllSheets } from '../hooks/useRolls'
import type { NpcKind, NpcRow } from '../types'
import { NpcCard } from './cards'

interface Props {
  userId: string
  onOpen: (npcId: string) => void
}

/** Seção do mestre: NPCs e Bosses dele, separados dos NPCs que os jogadores criaram. */
export function MasterNpcsTab({ userId, onOpen }: Props) {
  const { npcs, loading, error, create } = useNpcList(userId)
  const { sheets } = useAllSheets()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState<NpcKind | null>(null)

  const playerName = useMemo(() => new Map(sheets.map((s) => [s.owner, s.name || 'Sem nome'])), [sheets])

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase()
    const byName = (a: NpcRow, b: NpcRow) => (a.name || '~').localeCompare(b.name || '~', 'pt-BR')
    const shown = npcs.filter((n) => !t || `${n.name} ${n.data.race} ${n.data.rank}`.toLowerCase().includes(t))
    return {
      bosses: shown.filter((n) => n.by_master && n.kind === 'boss').sort(byName),
      masterNpcs: shown.filter((n) => n.by_master && n.kind === 'npc').sort(byName),
      players: shown.filter((n) => !n.by_master).sort(byName),
    }
  }, [npcs, q])

  async function add(kind: NpcKind) {
    setCreating(kind)
    const id = await create(kind)
    setCreating(null)
    if (id) onOpen(id)
  }

  return (
    <main className="master-main">
      <div className="master-tools">
        <input value={q} placeholder="Buscar NPC por nome, raça ou patente…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar NPC" />
        <span className="muted">{npcs.length} no total</span>
        <button type="button" className="btn primary" onClick={() => void add('npc')} disabled={creating !== null}>
          {creating === 'npc' ? 'Criando…' : '+ Novo NPC'}
        </button>
        <button type="button" className="btn danger" onClick={() => void add('boss')} disabled={creating !== null}>
          {creating === 'boss' ? 'Criando…' : '+ Novo Boss'}
        </button>
      </div>
      {error && <p className="banner-error">{error}</p>}
      {loading && <p className="muted">Carregando NPCs…</p>}

      <section className="npc-section">
        <div className="section-head">
          <h2>Bosses</h2>
          <span className="muted">{groups.bosses.length}</span>
        </div>
        {!loading && groups.bosses.length === 0 && <p className="muted">Nenhum boss. Use “+ Novo Boss”.</p>}
        <div className="master-grid">
          {groups.bosses.map((n) => (
            <NpcCard key={n.id} npc={n} onOpen={() => onOpen(n.id)} />
          ))}
        </div>
      </section>

      <section className="npc-section">
        <div className="section-head">
          <h2>NPCs do Mestre</h2>
          <span className="muted">{groups.masterNpcs.length}</span>
        </div>
        {!loading && groups.masterNpcs.length === 0 && <p className="muted">Nenhum NPC seu ainda.</p>}
        <div className="master-grid">
          {groups.masterNpcs.map((n) => (
            <NpcCard key={n.id} npc={n} onOpen={() => onOpen(n.id)} />
          ))}
        </div>
      </section>

      <section className="npc-section npc-section-players">
        <div className="section-head">
          <div>
            <h2>NPCs dos jogadores</h2>
            <p className="muted">Criados pelos jogadores. Você pode abrir e editar qualquer um.</p>
          </div>
          <span className="muted">{groups.players.length}</span>
        </div>
        {!loading && groups.players.length === 0 && <p className="muted">Os jogadores ainda não criaram NPCs.</p>}
        <div className="master-grid">
          {groups.players.map((n) => (
            <NpcCard key={n.id} npc={n} onOpen={() => onOpen(n.id)} ownerLabel={`de ${playerName.get(n.owner) ?? 'jogador'}`} />
          ))}
        </div>
      </section>
    </main>
  )
}
