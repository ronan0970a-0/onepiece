import { formatBerry } from '../lib/sheet'
import type { KlassId, NpcKind, NpcRow, RevealedNpc } from '../types'

export const KLASS_LABEL: Record<KlassId, string> = { pirata: 'Pirata', marinha: 'Marinha', outros: 'Outros' }
export const KIND_LABEL: Record<NpcKind, string> = { npc: 'NPC', boss: 'Boss' }

export function Mini({ label, cur, max, kind }: { label: string; cur: number; max: number; kind: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (cur / max) * 100)) : 0
  return (
    <div className={`mini res-${kind}`}>
      <span>
        {label} {cur}/{max}
      </span>
      <div className="res-track">
        <div className="res-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Cartão de NPC com a ficha completa (só quem é dono ou o mestre chega a ver). */
export function NpcCard({ npc, onOpen, ownerLabel }: { npc: NpcRow; onOpen: () => void; ownerLabel?: string }) {
  const d = npc.data
  return (
    <button type="button" className={`mcard mcard-${d.klass}`} onClick={onOpen}>
      <div className="mcard-photo" style={d.photoUrl ? { backgroundImage: `url("${d.photoUrl}")` } : undefined}>
        {!d.photoUrl && <span>?</span>}
      </div>
      <div className="mcard-body">
        <div className="mcard-top">
          <strong>{d.name || 'Sem nome'}</strong>
          <span className={`badge badge-${npc.kind}`}>{KIND_LABEL[npc.kind]}</span>
        </div>
        <p className="muted">{[KLASS_LABEL[d.klass], d.race, d.rank, `LvL ${d.level}`].filter(Boolean).join(' · ')}</p>
        {d.klass === 'pirata' && d.bounty > 0 && <p className="mcard-bounty">฿ {formatBerry(d.bounty)}</p>}
        <Mini label="HP" cur={d.hp.current} max={d.hp.max} kind="hp" />
        <Mini label="STA" cur={d.stamina.current} max={d.stamina.max} kind="stamina" />
        <p className="mcard-foot">
          <span className={npc.revealed ? 'tag-on' : 'tag-off'}>{npc.revealed ? '👁 Revelado' : '🔒 Oculto'}</span>
          {ownerLabel && <span className="muted"> · {ownerLabel}</span>}
        </p>
      </div>
    </button>
  )
}

/** NPC revelado: só identidade (foto, nome, facção, patente, recompensa). Não abre ficha. */
export function RevealedCard({ npc }: { npc: RevealedNpc }) {
  return (
    <div className={`mcard static mcard-${npc.klass}`}>
      <div className="mcard-photo" style={npc.photo_url ? { backgroundImage: `url("${npc.photo_url}")` } : undefined}>
        {!npc.photo_url && <span>?</span>}
      </div>
      <div className="mcard-body">
        <div className="mcard-top">
          <strong>{npc.name || 'Sem nome'}</strong>
          <span className={`badge badge-${npc.kind}`}>{KIND_LABEL[npc.kind]}</span>
        </div>
        <p className="muted">{[KLASS_LABEL[npc.klass], npc.race, npc.rank].filter(Boolean).join(' · ')}</p>
        {npc.klass === 'pirata' && npc.bounty > 0 && <p className="mcard-bounty">฿ {formatBerry(npc.bounty)}</p>}
      </div>
    </div>
  )
}
