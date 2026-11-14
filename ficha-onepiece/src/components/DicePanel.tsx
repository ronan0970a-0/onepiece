import { useState } from 'react'
import type { Roller } from '../hooks/useRoller'
import { DICE_SIDES, critOf, formatExpr } from '../lib/dice'
import { clamp } from '../lib/sheet'

interface Props {
  roller: Roller
  title?: string
}

export function DicePanel({ roller, title = 'Dados' }: Props) {
  const [sides, setSides] = useState<number>(20)
  const [count, setCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [label, setLabel] = useState('')
  const { last, busy, error } = roller
  const crit = last ? critOf(last) : null

  return (
    <section className="card dice">
      <div className="card-head">
        <h2>{title}</h2>
      </div>

      <div className="dice-sides" role="group" aria-label="Tipo de dado">
        {DICE_SIDES.map((s) => (
          <button key={s} type="button" className={`seg${sides === s ? ' on' : ''}`} onClick={() => setSides(s)}>
            d{s}
          </button>
        ))}
      </div>

      <div className="dice-row">
        <label className="field">
          <span>Qtd.</span>
          <div className="stepper">
            <button type="button" className="btn small" onClick={() => setCount((c) => clamp(c - 1, 1, 20))}>
              −
            </button>
            <output>{count}</output>
            <button type="button" className="btn small" onClick={() => setCount((c) => clamp(c + 1, 1, 20))}>
              +
            </button>
          </div>
        </label>
        <label className="field">
          <span>Modificador</span>
          <div className="stepper">
            <button type="button" className="btn small" onClick={() => setModifier((m) => clamp(m - 1, -999, 999))}>
              −
            </button>
            <output>{modifier > 0 ? `+${modifier}` : modifier}</output>
            <button type="button" className="btn small" onClick={() => setModifier((m) => clamp(m + 1, -999, 999))}>
              +
            </button>
          </div>
        </label>
      </div>

      <label className="field">
        <span>Motivo (opcional)</span>
        <input value={label} maxLength={60} placeholder="ex.: Ataque com a espada" onChange={(e) => setLabel(e.target.value)} />
      </label>

      <button
        type="button"
        className="btn primary big"
        disabled={busy}
        onClick={() => void roller.roll(label.trim(), count, sides, modifier)}
      >
        {busy ? 'Rolando…' : `🎲 Rolar ${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`}
      </button>

      {error && <p className="error">{error}</p>}

      {last && (
        <div className={`dice-result${crit ? ` ${crit}` : ''}`} aria-live="polite">
          <div className="dice-total">{last.total}</div>
          <div className="dice-detail">
            <strong>{formatExpr(last)}</strong>
            {last.label && <span> · {last.label}</span>}
            <div className="dice-faces">
              {last.results.map((r, i) => (
                <span key={i} className="die">
                  {r}
                </span>
              ))}
              {last.modifier !== 0 && <span className="die mod">{last.modifier > 0 ? `+${last.modifier}` : last.modifier}</span>}
            </div>
            {crit === 'crit' && <em>Crítico!</em>}
            {crit === 'fumble' && <em>Falha crítica…</em>}
          </div>
        </div>
      )}
    </section>
  )
}
