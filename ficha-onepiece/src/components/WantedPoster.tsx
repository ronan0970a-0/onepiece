import { formatBerry } from '../lib/sheet'

interface Props {
  name: string
  bounty: number
  photoUrl: string
}

/**
 * Cartaz de recompensa. A imagem /assets/poster.png tem a "janela" da foto transparente,
 * então a foto do personagem fica ATRÁS do cartaz. Nome e valor são texto por cima.
 */
export function WantedPoster({ name, bounty, photoUrl }: Props) {
  const shownName = (name || 'Seu Nome').toUpperCase()
  const amount = formatBerry(bounty)
  // diminui a fonte para nomes/valores longos caberem no cartaz (unidades cqw = % da largura do cartaz)
  const nameSize = Math.max(3.2, Math.min(7.4, 97 / Math.max(shownName.length, 8)))
  const amountSize = Math.max(3.4, Math.min(8, 68 / (Math.max(amount.length, 4) * 0.78)))

  return (
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
  )
}
