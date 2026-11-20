import { useMemo, useState } from 'react'
import { useAllSheets } from '../hooks/useRolls'
import { useRoller } from '../hooks/useRoller'
import { formatBerry } from '../lib/sheet'
import type { SheetRow } from '../types'
import { KLASS_LABEL, Mini } from './cards'
import { DicePanel } from './DicePanel'
import { Header } from './Header'
import { MasterNpcsTab } from './MasterNpcsTab'
import { NpcView } from './NpcView'
import { RollHistory } from './RollHistory'
import { SheetView } from './SheetView'

interface Props {
  userId: string
  email?: string
  onSignOut: () => void
}

export function MasterPanel({ userId, email, onSignOut }: Props) {
  const [tab, setTab] = useState<'sheets' | 'npcs' | 'history'>('sheets')
  const [openId, setOpenId] = useState<string | null>(null)
  const [openNpc, setOpenNpc] = useState<string | null>(null)

  if (openNpc) {
    return (
      <NpcView
        key={openNpc}
        npcId={openNpc}
        userId={userId}
        email={email}
        rollSheetId={null}
        isMaster
        onBack={() => setOpenNpc(null)}
        onSignOut={onSignOut}
      />
    )
  }

  if (openId) {
    return (
      <SheetView
        key={openId}
        sheetId={openId}
        userId={userId}
        email={email}
        canRoll={false}
        onBack={() => setOpenId(null)}
        onSignOut={onSignOut}
      />
    )
  }

  return (
    <div className="app" data-theme="pirata" data-mode="dark">
      <Header klass="pirata" title="Painel do Mestre" subtitle="Fichas, NPCs e dados da mesa" email={email} onSignOut={onSignOut} />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'sheets'} className={`tab${tab === 'sheets' ? ' on' : ''}`} onClick={() => setTab('sheets')}>
          Fichas
        </button>
        <button role="tab" aria-selected={tab === 'npcs'} className={`tab${tab === 'npcs' ? ' on' : ''}`} onClick={() => setTab('npcs')}>
          NPCs e Bosses
        </button>
        <button role="tab" aria-selected={tab === 'history'} className={`tab${tab === 'history' ? ' on' : ''}`} onClick={() => setTab('history')}>
          Histórico de dados
        </button>
      </div>
      {tab === 'sheets' && <SheetsTab onOpen={setOpenId} />}
      {tab === 'npcs' && <MasterNpcsTab userId={userId} onOpen={setOpenNpc} />}
      {tab === 'history' && <HistoryTab />}
    </div>
  )
}

function SheetsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { sheets, loading } = useAllSheets()
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return [...sheets]
      .filter((s) => !t || `${s.name} ${s.data.race} ${s.data.rank}`.toLowerCase().includes(t))
      .sort((a, b) => (a.name || '~').localeCompare(b.name || '~', 'pt-BR'))
  }, [sheets, q])

  return (
    <main className="master-main">
      <div className="master-tools">
        <input value={q} placeholder="Buscar por nome, raça ou patente…" onChange={(e) => setQ(e.target.value)} aria-label="Buscar ficha" />
        <span className="muted">{sheets.length} fichas</span>
      </div>
      {loading && <p className="muted">Carregando fichas…</p>}
      {!loading && list.length === 0 && <p className="muted">Nenhuma ficha encontrada. Quando os jogadores criarem as fichas, elas aparecem aqui.</p>}
      <div className="master-grid">
        {list.map((s) => (
          <SheetCard key={s.id} sheet={s} onOpen={() => onOpen(s.id)} />
        ))}
      </div>
    </main>
  )
}

function SheetCard({ sheet, onOpen }: { sheet: SheetRow; onOpen: () => void }) {
  const d = sheet.data
  return (
    <button type="button" className={`mcard mcard-${d.klass}`} onClick={onOpen}>
      <div className="mcard-photo" style={d.photoUrl ? { backgroundImage: `url("${d.photoUrl}")` } : undefined}>
        {!d.photoUrl && <span>?</span>}
      </div>
      <div className="mcard-body">
        <div className="mcard-top">
          <strong>{d.name || 'Sem nome'}</strong>
          <span className="badge">{KLASS_LABEL[d.klass]}</span>
        </div>
        <p className="muted">
          {[d.race, d.rank, `LvL ${d.level}`].filter(Boolean).join(' · ')}
        </p>
        {d.klass === 'pirata' && <p className="mcard-bounty">฿ {formatBerry(d.bounty)}</p>}
        <Mini label="HP" cur={d.hp.current} max={d.hp.max} kind="hp" />
        <Mini label="STA" cur={d.stamina.current} max={d.stamina.max} kind="stamina" />
        <Mini label="SAN" cur={d.sanity.current} max={d.sanity.max} kind="sanity" />
      </div>
    </button>
  )
}

function HistoryTab() {
  const roller = useRoller(null)
  return (
    <main className="master-history">
      <div className="history-side">
        <DicePanel roller={roller} title="Rolagem do Mestre" />
      </div>
      <RollHistory title="Histórico geral de dados" rolls={roller.rolls} loading={roller.loading} showPlayer />
    </main>
  )
}
