import { useRef, useState } from 'react'
import { uploadPhoto } from '../lib/photos'

interface Props {
  url: string
  /** id do dono da ficha: a foto vai para a pasta dele no Storage */
  ownerId: string
  sheetId: string
  onChange: (url: string) => void
}

export function PhotoField({ url, ownerId, sheetId, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await uploadPhoto(file, ownerId, sheetId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="photo-field">
      <div
        className="photo-preview"
        style={url ? { backgroundImage: `url("${url}")` } : undefined}
        role="img"
        aria-label="Foto do personagem"
      >
        {!url && <span>Sem foto</span>}
      </div>
      <div className="photo-actions">
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Enviando…' : url ? 'Trocar foto' : 'Enviar foto'}
        </button>
        {url && (
          <button type="button" className="btn ghost" disabled={busy} onClick={() => onChange('')}>
            Remover
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
