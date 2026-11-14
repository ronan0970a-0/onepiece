import { useMemo, useState } from 'react'
import { critOf, formatExpr } from '../lib/dice'
import type { RollRow } from '../types'

interface Props {
  rolls: RollRow[]
  loading?: boolean
  title?: string
  /** Versão curta (lista dos últimos resultados, sem filtro). */
  compact?: boolean
  /** Mostra o nome de quem rolou e o filtro por jogador (visão do mestre). */
  showPlayer?: boolean
}

const time = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function RollHistory({ rolls, loading, title = 'Histórico de dados', compact, showPlayer }: Props) {
  const [who, setWho] = useState('')
  const [text, setText] = useState('')

  const players = useMemo(() => Array.from(new Set(rolls.map((r) => r.character_name))).sort((a, b) => a.localeCompare(b)), [rolls])

  const shown = useMemo(() => {
    let list = rolls
    if (who) list = list.filter((r) => r.character_name === who)
    const q = text.trim().toLowerCase()
    if (q) list = list.filter((r) => `${r.label} ${r.character_name}`.toLowerCase().includes(q))
    return compact ? list.slice(0, 10) : list
  }, [rolls, who, text, compact])

  return (
    <section className="card history">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="muted">{rolls.length} rolagens</span>
      </div>

      {!compact && showPlayer && (
        <div className="history-filters">
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrar por personagem">
            <option value="">Todos os jogadores</option>
            {players.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input value={text} placeholder="Buscar por motivo…" onChange={(e) => setText(e.target.value)} aria-label="Buscar" />
        </div>
      )}

      {loading && <p className="muted">Carregando…</p>}
      {!loading && shown.length === 0 && <p className="muted">Nenhuma rolagem ainda.</p>}

      <ul className="roll-list">
        {shown.map((r) => {
          const crit = critOf(r)
          return (
            <li key={r.id} className={`roll${crit ? ` ${crit}` : ''}`}>
              <div className="roll-main">
                <span className="roll-total">{r.total}</span>
                <div className="roll-info">
                  <div>
                    {showPlayer && <strong className="roll-who">{r.character_name}</strong>}
                    {showPlayer && ' · '}
                    <span className="roll-expr">{formatExpr(r)}</span>
                    {r.label && <span className="roll-label"> · {r.label}</span>}
                  </div>
                  <div className="roll-faces">
                    [{r.results.join(', ')}]
                    {r.modifier !== 0 && (r.modifier > 0 ? ` +${r.modifier}` : ` ${r.modifier}`)}
                    {crit === 'crit' && <b> · CRÍTICO</b>}
                    {crit === 'fumble' && <b> · FALHA CRÍTICA</b>}
                  </div>
                </div>
              </div>
              <time dateTime={r.created_at}>{time.format(new Date(r.created_at))}</time>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
