import { useEffect, useRef, useState } from 'react'
import { clamp, newId } from '../lib/sheet'
import type { Entry, Resource } from '../types'
import { EntryPhoto } from './EntryPhoto'

// ---------- texto ----------

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}

export function Field({ label, value, onChange, placeholder, maxLength }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

// ---------- número (aceita digitar livre, só confirma números válidos) ----------

interface NumInputProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  format?: (n: number) => string
  className?: string
  ariaLabel?: string
}

export function NumInput({ value, onChange, min = -1e12, max = 1e12, format, className, ariaLabel }: NumInputProps) {
  const show = (n: number) => (format ? format(n) : String(n))
  const [text, setText] = useState(show(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(show(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => {
        focused.current = true
        setText(String(value))
        e.target.select()
      }}
      onBlur={() => {
        focused.current = false
        setText(show(value))
      }}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        const n = Number(t.replace(/\./g, '').replace(',', '.'))
        if (t.trim() !== '' && t.trim() !== '-' && Number.isFinite(n)) onChange(clamp(Math.round(n), min, max))
      }}
    />
  )
}

interface NumFieldProps extends Omit<NumInputProps, 'className' | 'ariaLabel'> {
  label: string
}

export function NumField({ label, ...rest }: NumFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <NumInput {...rest} ariaLabel={label} />
    </label>
  )
}

// ---------- barras (HP / Stamina / Sanidade) ----------

interface ResourceBarProps {
  label: string
  kind: 'hp' | 'stamina' | 'sanity'
  value: Resource
  onChange: (r: Resource) => void
}

export function ResourceBar({ label, kind, value, onChange }: ResourceBarProps) {
  const pct = value.max > 0 ? clamp((value.current / value.max) * 100, 0, 100) : 0
  const step = (d: number) => onChange({ ...value, current: clamp(value.current + d, -1_000_000, 1_000_000) })

  return (
    <div className={`res res-${kind}`}>
      <div className="res-top">
        <strong>{label}</strong>
        <span className="res-nums">
          <NumInput
            className="res-input"
            ariaLabel={`${label} atual`}
            value={value.current}
            min={-1_000_000}
            max={1_000_000}
            onChange={(n) => onChange({ ...value, current: n })}
          />
          <span>/</span>
          <NumInput
            className="res-input"
            ariaLabel={`${label} máximo`}
            value={value.max}
            min={0}
            max={1_000_000}
            onChange={(n) => onChange({ ...value, max: n })}
          />
        </span>
      </div>
      <div className="res-track" role="progressbar" aria-valuemin={0} aria-valuemax={value.max} aria-valuenow={value.current}>
        <div className="res-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="res-btns">
        {[-10, -1, 1, 10].map((d) => (
          <button key={d} type="button" className="btn small" onClick={() => step(d)}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
        <button type="button" className="btn small ghost" onClick={() => onChange({ ...value, current: value.max })}>
          Cheio
        </button>
      </div>
    </div>
  )
}

// ---------- status com botão de rolar ----------

interface StatBoxProps {
  label: string
  value: number
  onChange: (n: number) => void
  onRoll?: () => void
  rolling?: boolean
}

export function StatBox({ label, value, onChange, onRoll, rolling }: StatBoxProps) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <NumInput className="stat-input" ariaLabel={label} value={value} onChange={onChange} min={-999} max={9999} />
      {onRoll && (
        <button
          type="button"
          className="btn small stat-roll"
          disabled={rolling}
          onClick={onRoll}
          title={`Rolar 1d20 + ${value} (${label})`}
        >
          🎲 d20
        </button>
      )}
    </div>
  )
}

// ---------- listas (frutas, hakis, acessórios) ----------

interface EntryListProps {
  title: string
  items: Entry[]
  onChange: (items: Entry[]) => void
  addLabel: string
  namePlaceholder: string
  descPlaceholder: string
  emptyText: string
  /** Se informado, cada item ganha um campo de foto (enviada para a pasta do dono da ficha). */
  photos?: { ownerId: string; sheetId: string }
}

export function EntryList({ title, items, onChange, addLabel, namePlaceholder, descPlaceholder, emptyText, photos }: EntryListProps) {
  const patch = (id: string, p: Partial<Entry>) => onChange(items.map((e) => (e.id === id ? { ...e, ...p } : e)))
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <button type="button" className="btn small" onClick={() => onChange([...items, { id: newId(), name: '', description: '' }])}>
          + {addLabel}
        </button>
      </div>
      {items.length === 0 && <p className="muted">{emptyText}</p>}
      <div className="entries">
        {items.map((e) => (
          <div key={e.id} className={`entry${photos ? ' with-photo' : ''}`}>
            {photos && (
              <EntryPhoto
                url={e.photoUrl ?? ''}
                label={e.name || 'item'}
                ownerId={photos.ownerId}
                sheetId={photos.sheetId}
                onChange={(u) => patch(e.id, { photoUrl: u })}
              />
            )}
            <div className="entry-fields">
              <div className="entry-row">
                <input
                  className="entry-name"
                  value={e.name}
                  placeholder={namePlaceholder}
                  maxLength={120}
                  onChange={(ev) => patch(e.id, { name: ev.target.value })}
                />
                <button
                  type="button"
                  className="btn small danger"
                  aria-label={`Remover ${e.name || 'item'}`}
                  onClick={() => onChange(items.filter((x) => x.id !== e.id))}
                >
                  ✕
                </button>
              </div>
              <textarea
                rows={photos ? 3 : 2}
                value={e.description}
                placeholder={descPlaceholder}
                maxLength={4000}
                onChange={(ev) => patch(e.id, { description: ev.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
