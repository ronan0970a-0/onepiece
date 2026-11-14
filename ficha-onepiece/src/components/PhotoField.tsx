import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeImage } from '../lib/sheet'

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
    if (!file.type.startsWith('image/')) return setError('Escolha um arquivo de imagem.')
    if (file.size > 15 * 1024 * 1024) return setError('Imagem muito grande (máx. 15 MB).')
    setBusy(true)
    try {
      const blob = await resizeImage(file)
      const path = `${ownerId}/${sheetId}-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('character-photos')
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (upErr) throw new Error(upErr.message)
      const { data } = supabase.storage.from('character-photos').getPublicUrl(path)
      onChange(data.publicUrl)
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
