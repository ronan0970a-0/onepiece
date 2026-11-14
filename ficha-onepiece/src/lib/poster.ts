import { formatBerry } from './sheet'

/**
 * Geometria do cartaz (em % da largura/altura da imagem /assets/poster.png, 666×994).
 * É a MESMA usada no CSS (.poster-photo / .poster-name / .poster-bounty), para a tela e o PNG baixado ficarem iguais.
 */
export const POSTER = {
  photo: { x: 0.1066, y: 0.2203, w: 0.8048, h: 0.4145 },
  name: { x: 0.1, y: 0.722, w: 0.8, h: 0.106 },
  bounty: { x: 0.203, y: 0.843, w: 0.72, h: 0.054 },
  textColor: '#2b170d',
}

/** Texto exibido e tamanho da fonte (em % da largura do cartaz), reduzido para nomes/valores longos caberem. */
export function posterText(name: string, bounty: number) {
  const shownName = (name || 'Seu Nome').toUpperCase()
  const amount = formatBerry(bounty)
  return {
    shownName,
    amount,
    nameSize: Math.max(3.2, Math.min(7.4, 97 / Math.max(shownName.length, 8))),
    amountSize: Math.max(3.4, Math.min(8, 68 / (Math.max(amount.length, 4) * 0.78))),
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar o molde do cartaz.'))
    img.src = src
  })
}

/** Desenha o cartaz completo (foto sobre fundo preto → molde → nome → valor) e baixa como PNG. */
export async function downloadPoster(name: string, bounty: number, photoUrl: string): Promise<void> {
  const bg = await loadImage('/assets/poster.png')
  const SCALE = 2 // 2× o molde, para o texto ficar nítido
  const W = bg.naturalWidth * SCALE
  const H = bg.naturalHeight * SCALE

  // garante que a fonte do cartaz já carregou antes de desenhar o texto
  try {
    await document.fonts.load('900 40px Cinzel')
  } catch {
    /* sem a fonte, usa serif */
  }

  let photo: ImageBitmap | null = null
  if (photoUrl) {
    try {
      const res = await fetch(photoUrl, { mode: 'cors' })
      if (!res.ok) throw new Error(String(res.status))
      photo = await createImageBitmap(await res.blob())
    } catch {
      throw new Error('Não foi possível carregar a foto para montar o cartaz. Tente de novo.')
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível gerar a imagem.')

  // 1) janela da foto: fundo preto + foto inteira, centralizada (sem cortar)
  const p = POSTER.photo
  const px = p.x * W
  const py = p.y * H
  const pw = p.w * W
  const ph = p.h * H
  ctx.fillStyle = '#000'
  ctx.fillRect(px, py, pw, ph)
  if (photo) {
    const s = Math.min(pw / photo.width, ph / photo.height)
    const dw = photo.width * s
    const dh = photo.height * s
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, py, pw, ph)
    ctx.clip()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(photo, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh)
    ctx.restore()
    photo.close()
  }

  // 2) molde por cima (a janela da foto é transparente)
  ctx.drawImage(bg, 0, 0, W, H)

  // 3) nome e recompensa
  const t = posterText(name, bounty)
  ctx.fillStyle = POSTER.textColor
  ctx.textBaseline = 'middle'
  const drawText = (text: string, box: { x: number; y: number; w: number; h: number }, size: number, align: 'center' | 'left') => {
    const fontPx = (size / 100) * W
    ctx.save()
    ctx.beginPath()
    ctx.rect(box.x * W, box.y * H, box.w * W, box.h * H)
    ctx.clip()
    ctx.font = `900 ${fontPx}px Cinzel, serif`
    ctx.textAlign = align
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = align === 'center' ? `${0.02 * fontPx}px` : '0px'
    ctx.fillText(text, align === 'center' ? (box.x + box.w / 2) * W : box.x * W, (box.y + box.h / 2) * H)
    ctx.restore()
  }
  drawText(t.shownName, POSTER.name, t.nameSize, 'center')
  drawText(t.amount, POSTER.bounty, t.amountSize, 'left')

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png'),
  )
  const slug = (name || 'procurado').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'procurado'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `procurado-${slug}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
