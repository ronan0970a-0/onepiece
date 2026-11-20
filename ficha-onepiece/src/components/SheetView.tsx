import { useState } from 'react'
import { useSheetDoc } from '../hooks/useSheet'
import { useRoller, type Roller } from '../hooks/useRoller'
import { appTheme } from '../lib/theme'
import { DicePanel } from './DicePanel'
import { Header } from './Header'
import { IdCard } from './IdCard'
import { NpcTab } from './NpcTab'
import { NpcView } from './NpcView'
import { RollHistory } from './RollHistory'
import { SheetEditor } from './SheetEditor'
import { WantedBoard } from './WantedBoard'
import { WantedPoster } from './WantedPoster'

interface Props {
  sheetId: string
  userId: string
  email?: string
  /** true = o dono da ficha (pode rolar dados e usa as abas Procurados/NPCs). O mestre vendo a ficha de um jogador usa false. */
  canRoll: boolean
  onSignOut: () => void
  onBack?: () => void
}

export type SheetTab = 'ficha' | 'procurados' | 'npcs'

interface TabState {
  tab: SheetTab
  setTab: (t: SheetTab) => void
  onOpenNpc: (id: string) => void
}

export function SheetView(props: Props) {
  // o estado das abas fica aqui para sobreviver a abrir/fechar a ficha de um NPC
  const [tab, setTab] = useState<SheetTab>('ficha')
  const [openNpc, setOpenNpc] = useState<string | null>(null)

  if (props.canRoll && openNpc) {
    return (
      <NpcView
        key={openNpc}
        npcId={openNpc}
        userId={props.userId}
        email={props.email}
        rollSheetId={props.sheetId}
        isMaster={false}
        onBack={() => setOpenNpc(null)}
        onSignOut={props.onSignOut}
      />
    )
  }

  const tabs: TabState = { tab, setTab, onOpenNpc: setOpenNpc }
  return props.canRoll ? <WithRoller {...props} tabs={tabs} /> : <SheetLayout {...props} roller={null} tabs={tabs} />
}

function WithRoller(props: Props & { tabs: TabState }) {
  const roller = useRoller(props.sheetId)
  return <SheetLayout {...props} roller={roller} />
}

function SheetLayout({
  sheetId,
  userId,
  email,
  canRoll,
  onSignOut,
  onBack,
  roller,
  tabs,
}: Props & { roller: Roller | null; tabs: TabState }) {
  const { data, owner, status, error, update } = useSheetDoc(sheetId, userId)

  if (!data) {
    return (
      <div className="app" data-theme="pirata" data-mode="dark">
        <div className="splash">{error ? <p className="error">{error}</p> : <p>Carregando ficha…</p>}</div>
      </div>
    )
  }

  const theme = appTheme(data)
  // abas só para o dono da ficha; "Procurados" só para quem é da Marinha (se trocar de classe, volta para a ficha)
  const hasBoard = canRoll && data.klass === 'marinha'
  const tab: SheetTab = tabs.tab === 'procurados' && !hasBoard ? 'ficha' : tabs.tab

  return (
    <div className="app" data-theme={data.klass} data-mode={theme.mode} style={theme.style}>
      <Header klass={data.klass} email={email} status={status} onBack={onBack} onSignOut={onSignOut} />

      {error && <p className="banner-error">Não foi possível salvar: {error}</p>}

      {canRoll && (
        <div className="tabs" role="tablist">
          <TabButton id="ficha" current={tab} onPick={tabs.setTab}>
            Ficha
          </TabButton>
          {hasBoard && (
            <TabButton id="procurados" current={tab} onPick={tabs.setTab}>
              Procurados
            </TabButton>
          )}
          <TabButton id="npcs" current={tab} onPick={tabs.setTab}>
            NPCs
          </TabButton>
        </div>
      )}

      {tab === 'procurados' && <WantedBoard />}
      {tab === 'npcs' && <NpcTab userId={userId} onOpen={tabs.onOpenNpc} />}

      {tab === 'ficha' && (
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
      )}
    </div>
  )
}

function TabButton({
  id,
  current,
  onPick,
  children,
}: {
  id: SheetTab
  current: SheetTab
  onPick: (t: SheetTab) => void
  children: string
}) {
  return (
    <button role="tab" aria-selected={current === id} className={`tab${current === id ? ' on' : ''}`} onClick={() => onPick(id)}>
      {children}
    </button>
  )
}
