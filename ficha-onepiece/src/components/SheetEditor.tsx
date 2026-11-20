import { useRef, useState } from 'react'
import type { Roller } from '../hooks/useRoller'
import {
  DEFAULT_ACCENT,
  KLASSES,
  POWER_LABELS,
  STAT_LABELS,
  exportSheet,
  formatBerry,
  parseImport,
} from '../lib/sheet'
import type { Powers, SheetData, Stats } from '../types'
import { EntryList, Field, NumField, ResourceBar, StatBox } from './fields'
import { PhotoField } from './PhotoField'

interface Props {
  data: SheetData
  update: (fn: (prev: SheetData) => SheetData) => void
  sheetId: string
  ownerId: string
  roller: Roller | null
  /** Rótulo do seletor de classe (NPCs usam "Facção"). */
  klassLabel?: string
}

const SWATCHES = ['#f2f2f2', '#e6b04b', '#d64545', '#3aa0ff', '#4cc38a', '#b07cff', '#ff8fb8']

export function SheetEditor({ data, update, sheetId, ownerId, roller, klassLabel = 'Classe' }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const set = <K extends keyof SheetData>(key: K, value: SheetData[K]) => update((p) => ({ ...p, [key]: value }))

  async function onImport(file: File | undefined) {
    if (!file) return
    try {
      const imported = parseImport(await file.text())
      if (!window.confirm('Importar vai SUBSTITUIR os dados atuais desta ficha. Continuar?')) return
      update((p) => ({ ...imported, photoUrl: imported.photoUrl || p.photoUrl }))
      setMessage({ kind: 'ok', text: 'Ficha importada.' })
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Falha ao importar.' })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const rollStat = (label: string, value: number) => roller && void roller.roll(`Teste de ${label}`, 1, 20, value)

  return (
    <div className="editor">
      {/* ---------- identidade ---------- */}
      <section className="card">
        <div className="card-head">
          <h2>Personagem</h2>
          <div className="card-tools">
            <button type="button" className="btn small" onClick={() => exportSheet(data)}>
              Exportar
            </button>
            <button type="button" className="btn small" onClick={() => fileInput.current?.click()}>
              Importar
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </div>
        </div>
        {message && <p className={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</p>}

        <PhotoField url={data.photoUrl} ownerId={ownerId} sheetId={sheetId} onChange={(u) => set('photoUrl', u)} />

        <div className="klass-switch" role="group" aria-label={klassLabel}>
          <span className="klass-switch-label">{klassLabel}</span>
          {KLASSES.map((k) => (
            <button
              key={k.id}
              type="button"
              className={`seg seg-${k.id}${data.klass === k.id ? ' on' : ''}`}
              aria-pressed={data.klass === k.id}
              onClick={() => set('klass', k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="grid grid-3">
          <Field label="Nome" value={data.name} onChange={(v) => set('name', v)} maxLength={80} />
          <Field label="Idade" value={data.age} onChange={(v) => set('age', v)} maxLength={20} />
          <Field label="Raça" value={data.race} onChange={(v) => set('race', v)} maxLength={60} />
          <Field label="Altura" value={data.height} onChange={(v) => set('height', v)} placeholder="ex.: 1,80 m" maxLength={20} />
          <Field label="Peso" value={data.weight} onChange={(v) => set('weight', v)} placeholder="ex.: 75 kg" maxLength={20} />
          <Field label="Patente" value={data.rank} onChange={(v) => set('rank', v)} maxLength={80} />
          <NumField
            label="Recompensa (฿)"
            value={data.bounty}
            min={0}
            max={999_999_999_999_999}
            format={formatBerry}
            onChange={(n) => set('bounty', n)}
          />
          <NumField label="LvL" value={data.level} min={0} max={9999} onChange={(n) => set('level', n)} />
          <NumField label="LvL Fruta" value={data.fruitLevel} min={0} max={9999} onChange={(n) => set('fruitLevel', n)} />
          <NumField label="LvL Haki" value={data.hakiLevel} min={0} max={9999} onChange={(n) => set('hakiLevel', n)} />
        </div>
      </section>

      {/* ---------- recursos ---------- */}
      <section className="card">
        <div className="card-head">
          <h2>Vitalidade</h2>
          <span className="muted">Os máximos são editáveis</span>
        </div>
        <div className="res-list">
          <ResourceBar label="HP" kind="hp" value={data.hp} onChange={(v) => set('hp', v)} />
          <ResourceBar label="Stamina" kind="stamina" value={data.stamina} onChange={(v) => set('stamina', v)} />
          <ResourceBar label="Sanidade" kind="sanity" value={data.sanity} onChange={(v) => set('sanity', v)} />
        </div>
      </section>

      {/* ---------- status ---------- */}
      <section className="card">
        <div className="card-head">
          <h2>Status</h2>
          {roller && <span className="muted">🎲 rola 1d20 + valor</span>}
        </div>
        <div className="stat-grid">
          {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map((k) => (
            <StatBox
              key={k}
              label={STAT_LABELS[k]}
              value={data.stats[k]}
              onChange={(n) => update((p) => ({ ...p, stats: { ...p.stats, [k]: n } }))}
              onRoll={roller ? () => rollStat(STAT_LABELS[k], data.stats[k]) : undefined}
              rolling={roller?.busy}
            />
          ))}
        </div>
      </section>

      {/* ---------- poderes ---------- */}
      <section className="card">
        <div className="card-head">
          <h2>Fruta &amp; Haki</h2>
        </div>
        <div className="stat-grid">
          {(Object.keys(POWER_LABELS) as (keyof Powers)[]).map((k) => (
            <StatBox
              key={k}
              label={POWER_LABELS[k]}
              value={data.powers[k]}
              onChange={(n) => update((p) => ({ ...p, powers: { ...p.powers, [k]: n } }))}
              onRoll={roller ? () => rollStat(POWER_LABELS[k], data.powers[k]) : undefined}
              rolling={roller?.busy}
            />
          ))}
        </div>
      </section>

      <EntryList
        title="Frutas do Diabo"
        items={data.fruits}
        onChange={(v) => set('fruits', v)}
        addLabel="Fruta"
        namePlaceholder="Nome da fruta (???)"
        descPlaceholder="Tipo, poderes, fraquezas…"
        emptyText="Nenhuma fruta. Use “+ Fruta” (é possível ter mais de uma)."
        photos={{ ownerId, sheetId }}
      />

      <EntryList
        title="Hakis"
        items={data.hakis}
        onChange={(v) => set('hakis', v)}
        addLabel="Haki"
        namePlaceholder="Nome da técnica / habilidade"
        descPlaceholder="Descrição, custo, alcance…"
        emptyText="Nenhuma habilidade de Haki registrada."
      />

      <EntryList
        title="Acessórios"
        items={data.accessories}
        onChange={(v) => set('accessories', v)}
        addLabel="Acessório"
        namePlaceholder="Nome do acessório"
        descPlaceholder="Efeitos, bônus, história…"
        emptyText="Nenhum acessório."
        photos={{ ownerId, sheetId }}
      />

      {/* ---------- cor (só Outros) ---------- */}
      {data.klass === 'outros' && (
        <section className="card">
          <div className="card-head">
            <h2>Aparência</h2>
            <span className="muted">Só para a classe “Outros”</span>
          </div>
          <div className="theme-row">
            <label className="field inline">
              <span>Cor de destaque</span>
              <input
                type="color"
                value={data.theme.accent}
                onChange={(e) => set('theme', { ...data.theme, accent: e.target.value })}
              />
            </label>
            <div className="swatches" role="group" aria-label="Cores prontas">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch${data.theme.accent.toLowerCase() === c ? ' on' : ''}`}
                  style={{ background: c }}
                  aria-label={`Usar a cor ${c}`}
                  onClick={() => set('theme', { ...data.theme, accent: c })}
                />
              ))}
            </div>
            <div className="klass-switch">
              <button
                type="button"
                className={`seg${data.theme.mode === 'dark' ? ' on' : ''}`}
                onClick={() => set('theme', { ...data.theme, mode: 'dark' })}
              >
                Escuro
              </button>
              <button
                type="button"
                className={`seg${data.theme.mode === 'light' ? ' on' : ''}`}
                onClick={() => set('theme', { ...data.theme, mode: 'light' })}
              >
                Claro
              </button>
              <button
                type="button"
                className="seg"
                onClick={() => set('theme', { accent: DEFAULT_ACCENT, mode: 'dark' })}
              >
                Padrão
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
