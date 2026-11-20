import { useMemo, useState } from 'react'
import { useSheetDoc } from '../hooks/useSheet'
import { useRoller, type Roller } from '../hooks/useRoller'
import { appTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import type { NpcKind } from '../types'
import { DicePanel } from './DicePanel'
import { Header } from './Header'
import { IdCard } from './IdCard'
import { RollHistory } from './RollHistory'
import { SheetEditor } from './SheetEditor'
import { WantedPoster } from './WantedPoster'

interface Props {
  npcId: string
  userId: string
  email?: string
  /** Jogador: id da PRÓPRIA ficha (as rolagens do NPC entram no histórico dele). Mestre: null. */
  rollSheetId: string | null
  isMaster: boolean
  onBack: () => void
  onSignOut: () => void
}

/** Ficha de um NPC / Boss: o mesmo editor da ficha, mais tipo, "revelar aos jogadores" e excluir. */
export function NpcView({ npcId, userId, email, rollSheetId, isMaster, onBack, onSignOut }: Props) {
  const { data, owner, meta, status, error, update, flush, setNpcMeta } = useSheetDoc(npcId, userId, 'npcs')
  const base = useRoller(rollSheetId)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // toda rolagem feita aqui leva o nome do NPC, para o histórico mostrar "Guarda Bob: Teste de Força"
  const name = data?.name || (meta?.kind === 'boss' ? 'Boss' : 'NPC')
  const roller: Roller = useMemo(
    () => ({ ...base, roll: (label, count, sides, modifier) => base.roll(label ? `${name}: ${label}` : name, count, sides, modifier) }),
    [base, name],
  )

  if (!data || !meta) {
    return (
      <div className="app" data-theme="pirata" data-mode="dark">
        <div className="splash">
          {error ? (
            <div>
              <p className="error">{error}</p>
              <button type="button" className="btn" onClick={onBack}>
                ← Voltar
              </button>
            </div>
          ) : (
            <p>Carregando NPC…</p>
          )}
        </div>
      </div>
    )
  }

  async function remove() {
    if (!window.confirm(`Excluir “${data?.name || 'este NPC'}” de vez? Isso não pode ser desfeito.`)) return
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await supabase.from('npcs').delete().eq('id', npcId)
    if (err) {
      setDeleteError(err.message)
      setDeleting(false)
      return
    }
    onBack()
  }

  const theme = appTheme(data)
  const kindLabel = meta.kind === 'boss' ? 'Boss' : 'NPC'

  return (
    <div className="app" data-theme={data.klass} data-mode={theme.mode} style={theme.style}>
      <Header
        klass={data.klass}
        title={data.name || `Novo ${kindLabel}`}
        subtitle={isMaster ? `${kindLabel}${meta.byMaster ? ' do mestre' : ' de jogador'}` : kindLabel}
        email={email}
        status={status}
        onBack={() => {
          void flush()
          onBack()
        }}
        backLabel="← NPCs"
        onSignOut={onSignOut}
      />

      {error && <p className="banner-error">Não foi possível salvar: {error}</p>}

      <main className="sheet-grid">
        <aside className="sheet-aside">
          {data.klass === 'pirata' ? (
            <WantedPoster name={data.name} bounty={data.bounty} photoUrl={data.photoUrl} />
          ) : (
            <IdCard data={data} />
          )}

          <section className="card npc-controls">
            <div className="card-head">
              <h2>{kindLabel}</h2>
              <span className={`badge badge-${meta.kind}`}>{kindLabel}</span>
            </div>

            {isMaster ? (
              <>
                <div className="klass-switch" role="group" aria-label="Tipo">
                  <span className="klass-switch-label">Tipo</span>
                  {(['npc', 'boss'] as NpcKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`seg${meta.kind === k ? ' on' : ''}`}
                      aria-pressed={meta.kind === k}
                      onClick={() => void setNpcMeta({ kind: k })}
                    >
                      {k === 'boss' ? 'Boss' : 'NPC'}
                    </button>
                  ))}
                </div>
                <label className="switch">
                  <input type="checkbox" checked={meta.revealed} onChange={(e) => void setNpcMeta({ revealed: e.target.checked })} />
                  <span>
                    <b>Revelar aos jogadores</b>
                    <small>
                      Todos passam a ver só foto, nome, raça, patente e recompensa. HP, status e itens continuam secretos.
                      {data.klass === 'pirata' && ' Como é pirata, também entra no quadro de Procurados da Marinha.'}
                    </small>
                  </span>
                </label>
              </>
            ) : (
              <p className="muted">Só você e o mestre veem esta ficha. O mestre decide se este NPC é revelado à mesa.</p>
            )}

            <button type="button" className="btn danger" onClick={() => void remove()} disabled={deleting}>
              {deleting ? 'Excluindo…' : `Excluir ${kindLabel}`}
            </button>
            {deleteError && <p className="error">{deleteError}</p>}
          </section>

          <DicePanel roller={roller} title={`Dados de ${name}`} />
          <RollHistory title="Rolagens recentes" rolls={roller.rolls} loading={roller.loading} compact showPlayer={isMaster} />
        </aside>

        <section className="sheet-main">
          <SheetEditor data={data} update={update} sheetId={npcId} ownerId={owner} roller={roller} klassLabel="Facção" />
        </section>
      </main>
    </div>
  )
}
