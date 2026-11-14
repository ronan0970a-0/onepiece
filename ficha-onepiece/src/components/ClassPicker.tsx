import { useState } from 'react'
import type { KlassId } from '../types'

interface Props {
  email?: string
  busy: boolean
  error: string | null
  onPick: (k: KlassId) => void
  onSignOut: () => void
}

const OPTIONS: { id: KlassId; title: string; text: string; image?: string }[] = [
  { id: 'pirata', title: 'Pirata', text: 'Liberdade, aventura e uma recompensa na cabeça.', image: '/assets/pirate-ship.jpg' },
  { id: 'marinha', title: 'Marinha', text: 'Justiça, disciplina e a lei dos mares.', image: '/assets/marine-ship.jpg' },
  { id: 'outros', title: 'Outros', text: 'Nem pirata, nem marinheiro. Escolha a sua própria cor.' },
]

export function ClassPicker({ email, busy, error, onPick, onSignOut }: Props) {
  const [selected, setSelected] = useState<KlassId | null>(null)

  return (
    <div className="app picker" data-theme="pirata" data-mode="dark">
      <header className="hdr hdr-outros">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <h1>Nova ficha</h1>
          </div>
          <div className="hdr-actions">
            {email && <span className="hdr-email">{email}</span>}
            <button type="button" className="btn ghost" onClick={onSignOut}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="picker-main">
        <h2 className="picker-title">Quem é você nos mares?</h2>
        <p className="muted center">Você poderá mudar de classe depois, a qualquer momento.</p>

        <div className="picker-grid">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`pick pick-${o.id}${selected === o.id ? ' on' : ''}`}
              aria-pressed={selected === o.id}
              onClick={() => setSelected(o.id)}
            >
              <div className="pick-img" style={o.image ? { backgroundImage: `url(${o.image})` } : undefined}>
                {o.id === 'marinha' && <img className="pick-logo" src="/assets/marine-logo.png" alt="Marine" />}
                {o.id === 'outros' && <span className="pick-swatches" aria-hidden />}
              </div>
              <div className="pick-body">
                <strong>{o.title}</strong>
                <span>{o.text}</span>
              </div>
            </button>
          ))}
        </div>

        {error && <p className="error center">{error}</p>}

        <div className="center">
          <button type="button" className="btn primary big" disabled={!selected || busy} onClick={() => selected && onPick(selected)}>
            {busy ? 'Criando…' : 'Criar ficha'}
          </button>
        </div>
      </main>
    </div>
  )
}
