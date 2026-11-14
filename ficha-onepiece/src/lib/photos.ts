import { supabase } from './supabase'
import { resizeImage } from './sheet'

const BUCKET = 'character-photos'
const MAX_BYTES = 15 * 1024 * 1024

/**
 * Reduz a imagem no navegador, envia ao Storage (pasta do dono da ficha) e devolve o link público.
 * Lança Error com mensagem em português para o componente mostrar.
 */
export async function uploadPhoto(file: File, ownerId: string, name: string, maxSide = 800): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > MAX_BYTES) throw new Error('Imagem muito grande (máx. 15 MB).')
  const blob = await resizeImage(file, maxSide)
  const path = `${ownerId}/${name}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
