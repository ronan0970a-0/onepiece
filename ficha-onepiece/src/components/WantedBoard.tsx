import { useMemo, useState } from 'react'
import { useWantedBoard } from '../hooks/useNpcs'
import { DANGER_TIERS, dangerOf, type DangerId } from '../lib/danger'
import { KIND_LABEL } from './cards'
import { WantedPoster } from './WantedPoster'

type Sort = 'bounty' | 'name'

/** Quadro de Procurados da Marinha: cartazes dos piratas, do mais ao menos perigoso. */
export function WantedBoard() {
  const { list, loading, error, refresh } = useWantedBoard()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<DangerId | 'all'>('all')
  const [sort, setSort] = useState<Sort>('bounty')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length }
    for (const e of list) c[dangerOf(e.bounty).id] = (c[dangerOf(e.bounty).id] ?? 0) + 1
    return c
  }, [list])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return list
      .filter((e) => (tier === 'all' || dangerOf(e.bounty).id === tier) && (!t || `${e.name} ${e.rank}`.toLowerCase().includes(t)))
      .sort((a, b) =>
        sort === 'bounty' ? b.bounty - a.bounty || a.name.localeCompare(b.name, 'pt-BR') : a.name.localeCompare(b.name, 'pt-BR'),
      )
  }, [list, q, tier, sort])

  return (
    <main className="master-main board">
      <div className="section-head">
        <div>
          <h2>Quadro de Procurados</h2>
          <p className="muted">Piratas na mira da Marinha. O nível de perigo vem do valor da recompensa.</p>
        </div>
        <button type="button" className="btn" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Atualizando…' : '↻ Atualizar'}
        </button>
      </div>

      {error && <p className="banner-error">{error}</p>}

      <div className="master-tools">
        <input value={q} placeholder="Buscar por nome ou patente…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar pirata" />
        <label className="field inline">
          <span>Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="bounty">Maior recompensa</option>
            <option value="name">Nome (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label="Nível de perigo">
        <button type="button" className={`chip${tier === 'all' ? ' on' : ''}`} onClick={() => setTier('all')}>
          Todos <b>{counts.all ?? 0}</b>
        </button>
        {DANGER_TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chip chip-${t.id}${tier === t.id ? ' on' : ''}`}
            onClick={() => setTier(tier === t.id ? 'all' : t.id)}
            title={t.range}
          >
            {t.label} <b>{counts[t.id] ?? 0}</b>
          </button>
        ))}
      </div>
      <p className="muted board-legend">{DANGER_TIERS.map((t) => `${t.label}: ${t.range}`).join('  ·  ')}</p>

      {loading && list.length === 0 && <p className="muted">Carregando procurados…</p>}
      {!loading && !error && shown.length === 0 && (
        <p className="muted">{list.length === 0 ? 'Nenhum pirata registrado ainda.' : 'Nenhum pirata com esse filtro.'}</p>
      )}

      <div className="board-grid">
        {shown.map((e) => {
          const danger = dangerOf(e.bounty)
          return (
            <article key={`${e.source}-${e.id}`} className="board-card">
              <span className={`danger-tag danger-${danger.id}`}>{danger.label}</span>
              <WantedPoster name={e.name} bounty={e.bounty} photoUrl={e.photo_url} compact />
              <p className="board-meta">
                {e.rank || 'Sem patente'}
                {e.source === 'npc' && e.kind && <span className={`badge badge-${e.kind}`}>{KIND_LABEL[e.kind]}</span>}
              </p>
            </article>
          )
        })}
      </div>
    </main>
  )
}
