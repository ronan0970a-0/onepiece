import { useRef, useState } from 'react'
import { uploadPhoto } from '../lib/photos'

interface Props {
  url: string
  label: string
  ownerId: string
  sheetId: string
  onChange: (url: string) => void
}

/** Miniatura quadrada de um item (fruta / acessório): clique para enviar ou trocar a foto. */
export function EntryPhoto({ url, label, ownerId, sheetId, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // o envio é assíncrono: usa sempre o callback mais recente, para não sobrescrever o que foi digitado enquanto a foto subia
  const latestOnChange = useRef(onChange)
  latestOnChange.current = onChange

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const link = await uploadPhoto(file, ownerId, `${sheetId}-item`, 600)
      latestOnChange.current(link)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="entry-photo">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <button
        type="button"
        className="entry-thumb"
        style={url ? { backgroundImage: `url("${url}")` } : undefined}
        disabled={busy}
        aria-label={url ? `Trocar a foto de ${label}` : `Enviar foto de ${label}`}
        onClick={() => input.current?.click()}
      >
        {busy ? <span>…</span> : !url && <span>+ Foto</span>}
      </button>
      {url && !busy && (
        <button type="button" className="entry-thumb-remove" aria-label={`Remover a foto de ${label}`} onClick={() => onChange('')}>
          Remover
        </button>
      )}
      {error && <p className="error entry-photo-error">{error}</p>}
    </div>
  )
}
