import { useState } from 'react'
import { downloadPoster, posterText } from '../lib/poster'

interface Props {
  name: string
  bounty: number
  photoUrl: string
  /** Versão para a galeria: botão de download menor. */
  compact?: boolean
}

/**
 * Cartaz de recompensa. A imagem /assets/poster.png tem a "janela" da foto transparente,
 * então a foto do personagem fica ATRÁS do cartaz (inteira, sobre fundo preto). Nome e valor são texto por cima.
 */
export function WantedPoster({ name, bounty, photoUrl, compact }: Props) {
  const { shownName, amount, nameSize, amountSize } = posterText(name, bounty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      await downloadPoster(name, bounty, photoUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao baixar o cartaz.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="poster-wrap">
      <div className="poster" aria-label={`Cartaz de recompensa de ${name || 'pirata'}`}>
        <div
          className="poster-photo"
          style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
          role="img"
          aria-label="Foto do personagem"
        >
          {!photoUrl && <span>?</span>}
        </div>
        <img className="poster-bg" src="/assets/poster.png" alt="" draggable={false} />
        <div className="poster-name" style={{ fontSize: `${nameSize}cqw` }}>
          {shownName}
        </div>
        <div className="poster-bounty" style={{ fontSize: `${amountSize}cqw` }}>
          {amount}
        </div>
      </div>
      <button type="button" className={`btn poster-download${compact ? ' small' : ''}`} disabled={busy} onClick={() => void download()}>
        {busy ? 'Gerando…' : compact ? '⬇ Baixar PNG' : '⬇ Baixar cartaz (PNG)'}
      </button>
      {error && <p className="error poster-error">{error}</p>}
    </div>
  )
}
