import type { SheetData } from '../types'

/** Cartão de identificação usado por Marinha e Outros (o cartaz de recompensa é só do Pirata). */
export function IdCard({ data }: { data: SheetData }) {
  const label = data.klass === 'marinha' ? 'Marinha' : 'Outros'
  return (
    <div className="idcard">
      <div
        className="idcard-photo"
        style={data.photoUrl ? { backgroundImage: `url("${data.photoUrl}")` } : undefined}
        role="img"
        aria-label="Foto do personagem"
      >
        {!data.photoUrl && <span>?</span>}
      </div>
      <div className="idcard-body">
        <span className="badge">{label}</span>
        <h2>{data.name || 'Sem nome'}</h2>
        <p>{data.rank || 'Sem patente'}</p>
        <dl>
          <div>
            <dt>Raça</dt>
            <dd>{data.race || '—'}</dd>
          </div>
          <div>
            <dt>LvL</dt>
            <dd>{data.level}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
