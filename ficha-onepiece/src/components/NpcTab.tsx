import { useMemo, useState } from 'react'
import { useNpcList, useRevealedNpcs } from '../hooks/useNpcs'
import { NpcCard, RevealedCard } from './cards'

interface Props {
  userId: string
  onOpen: (npcId: string) => void
}

/** Aba "NPCs" do jogador: os NPCs que ele criou + os que o mestre revelou (só identidade). */
export function NpcTab({ userId, onOpen }: Props) {
  const { npcs, loading, error, create } = useNpcList(userId)
  const revealed = useRevealedNpcs()
  const [creating, setCreating] = useState(false)

  const mine = useMemo(
    () => npcs.filter((n) => n.owner === userId).sort((a, b) => (a.name || '~').localeCompare(b.name || '~', 'pt-BR')),
    [npcs, userId],
  )

  async function newNpc() {
    setCreating(true)
    const id = await create('npc')
    setCreating(false)
    if (id) onOpen(id)
  }

  return (
    <main className="master-main npc-tab">
      <section className="npc-section">
        <div className="section-head">
          <div>
            <h2>Meus NPCs</h2>
            <p className="muted">Aliados, rivais, tripulantes… Só você e o mestre veem a ficha completa deles.</p>
          </div>
          <button type="button" className="btn primary" onClick={() => void newNpc()} disabled={creating}>
            {creating ? 'Criando…' : '+ Novo NPC'}
          </button>
        </div>
        {error && <p className="banner-error">{error}</p>}
        {loading && <p className="muted">Carregando NPCs…</p>}
        {!loading && !error && mine.length === 0 && <p className="muted">Você ainda não criou nenhum NPC.</p>}
        <div className="master-grid">
          {mine.map((n) => (
            <NpcCard key={n.id} npc={n} onOpen={() => onOpen(n.id)} />
          ))}
        </div>
      </section>

      <section className="npc-section">
        <div className="section-head">
          <div>
            <h2>Revelados pelo mestre</h2>
            <p className="muted">Personagens que a mesa já conhece. Você vê só a identidade, não a ficha.</p>
          </div>
          <button type="button" className="btn" onClick={() => void revealed.refresh()} disabled={revealed.loading}>
            {revealed.loading ? 'Atualizando…' : '↻ Atualizar'}
          </button>
        </div>
        {revealed.error && !error && <p className="banner-error">{revealed.error}</p>}
        {!revealed.loading && !revealed.error && revealed.list.length === 0 && (
          <p className="muted">O mestre ainda não revelou nenhum NPC.</p>
        )}
        <div className="master-grid">
          {revealed.list.map((n) => (
            <RevealedCard key={n.id} npc={n} />
          ))}
        </div>
      </section>
    </main>
  )
}
