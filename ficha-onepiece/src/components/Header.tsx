import type { ReactNode } from 'react'
import type { KlassId, SaveStatus } from '../types'

interface Props {
  klass: KlassId
  title?: string
  subtitle?: string
  email?: string
  status?: SaveStatus
  onBack?: () => void
  onSignOut?: () => void
  children?: ReactNode
}

const DEFAULT_TITLE: Record<KlassId, string> = {
  pirata: 'Ficha Pirata',
  marinha: 'Ficha da Marinha',
  outros: 'Ficha de Aventureiro',
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Salvando…',
  saved: 'Salvo ✓',
  error: 'Erro ao salvar',
}

export function Header({ klass, title, subtitle, email, status = 'idle', onBack, onSignOut, children }: Props) {
  return (
    <header className={`hdr hdr-${klass}`}>
      <div className="hdr-inner">
        <div className="hdr-brand">
          {onBack && (
            <button type="button" className="btn ghost" onClick={onBack}>
              ← Fichas
            </button>
          )}
          {klass === 'marinha' && <img className="hdr-logo" src="/assets/marine-logo.png" alt="Marine" />}
          <div>
            <h1>{title ?? DEFAULT_TITLE[klass]}</h1>
            {subtitle && <p className="hdr-sub">{subtitle}</p>}
          </div>
        </div>
        <div className="hdr-actions">
          {status !== 'idle' && <span className={`save-pill save-${status}`}>{STATUS_TEXT[status]}</span>}
          {children}
          {email && <span className="hdr-email">{email}</span>}
          {onSignOut && (
            <button type="button" className="btn ghost" onClick={onSignOut}>
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
