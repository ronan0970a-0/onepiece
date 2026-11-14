import type { CSSProperties } from 'react'
import { useSheetDoc } from '../hooks/useSheet'
import { useRoller, type Roller } from '../hooks/useRoller'
import { DEFAULT_ACCENT, onColor } from '../lib/sheet'
import { DicePanel } from './DicePanel'
import { Header } from './Header'
import { IdCard } from './IdCard'
import { RollHistory } from './RollHistory'
import { SheetEditor } from './SheetEditor'
import { WantedPoster } from './WantedPoster'

interface Props {
  sheetId: string
  userId: string
  email?: string
  /** true = o dono da ficha (pode rolar dados). O mestre vendo a ficha de um jogador usa false. */
  canRoll: boolean
  onSignOut: () => void
  onBack?: () => void
}

export function SheetView(props: Props) {
  return props.canRoll ? <WithRoller {...props} /> : <SheetLayout {...props} roller={null} />
}

function WithRoller(props: Props) {
  const roller = useRoller(props.sheetId)
  return <SheetLayout {...props} roller={roller} />
}

function SheetLayout({ sheetId, userId, email, onSignOut, onBack, roller }: Props & { roller: Roller | null }) {
  const { data, owner, status, error, update } = useSheetDoc(sheetId, userId)

  if (!data) {
    return (
      <div className="app" data-theme="pirata" data-mode="dark">
        <div className="splash">{error ? <p className="error">{error}</p> : <p>Carregando ficha…</p>}</div>
      </div>
    )
  }

  // classe "Outros": cor e modo escolhidos pelo jogador (no modo claro, o padrão branco vira quase preto)
  const accent =
    data.klass === 'outros'
      ? data.theme.accent === DEFAULT_ACCENT && data.theme.mode === 'light'
        ? '#111111'
        : data.theme.accent
      : undefined
  const style = accent
    ? ({ '--accent': accent, '--accent-2': accent, '--on-accent': onColor(accent) } as CSSProperties)
    : undefined

  return (
    <div className="app" data-theme={data.klass} data-mode={data.klass === 'outros' ? data.theme.mode : 'auto'} style={style}>
      <Header klass={data.klass} email={email} status={status} onBack={onBack} onSignOut={onSignOut} />

      {error && <p className="banner-error">Não foi possível salvar: {error}</p>}

      <main className="sheet-grid">
        <aside className="sheet-aside">
          {data.klass === 'pirata' ? (
            <WantedPoster name={data.name} bounty={data.bounty} photoUrl={data.photoUrl} />
          ) : (
            <IdCard data={data} />
          )}
          {roller && (
            <>
              <DicePanel roller={roller} />
              <RollHistory title="Minhas rolagens" rolls={roller.rolls} loading={roller.loading} compact />
            </>
          )}
        </aside>

        <section className="sheet-main">
          <SheetEditor data={data} update={update} sheetId={sheetId} ownerId={owner} roller={roller} />
        </section>
      </main>
    </div>
  )
}
