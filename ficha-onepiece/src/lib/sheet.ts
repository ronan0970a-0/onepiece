import type { Entry, KlassId, Resource, SheetData, ThemeMode } from '../types'

export const KLASSES: { id: KlassId; label: string }[] = [
  { id: 'pirata', label: 'Pirata' },
  { id: 'marinha', label: 'Marinha' },
  { id: 'outros', label: 'Outros' },
]

export const STAT_LABELS = {
  forca: 'Força',
  velocidade: 'Velocidade',
  resistencia: 'Resistência',
  carisma: 'Carisma',
  foco: 'Foco',
  inteligencia: 'Inteligência',
} as const

export const POWER_LABELS = {
  fruta: 'Fruta',
  hakiRei: 'Haki do Rei',
  hakiObservacao: 'Haki da Observação',
  hakiArmamento: 'Haki do Armamento',
} as const

export const DEFAULT_ACCENT = '#f2f2f2'

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createDefaultSheet(klass: KlassId): SheetData {
  return {
    version: 1,
    photoUrl: '',
    name: '',
    age: '',
    height: '',
    weight: '',
    klass,
    rank: '',
    bounty: 0,
    race: '',
    level: 0,
    fruitLevel: 0,
    hakiLevel: 0,
    hp: { current: 100, max: 100 },
    stamina: { current: 400, max: 400 },
    sanity: { current: 92, max: 100 },
    stats: { forca: 0, velocidade: 0, resistencia: 0, carisma: 0, foco: 0, inteligencia: 0 },
    powers: { fruta: 0, hakiRei: 0, hakiObservacao: 0, hakiArmamento: 0 },
    fruits: [{ id: newId(), name: '???', description: '' }],
    hakis: [],
    accessories: [],
    theme: { accent: DEFAULT_ACCENT, mode: 'dark' },
  }
}

// ---------- normalização (usada ao carregar do banco e ao importar JSON) ----------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function str(v: unknown, def = '', max = 2000): string {
  return typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : def
}

function num(v: unknown, def = 0, min = -1e12, max = 1e12): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.round(n)))
}

function resource(v: unknown, def: Resource): Resource {
  const o = isObj(v) ? v : {}
  const max = num(o.max, def.max, 0, 1_000_000)
  const current = num(o.current, def.current, -1_000_000, 1_000_000)
  return { current, max }
}

function entries(v: unknown): Entry[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 100).map((e) => {
    const o = isObj(e) ? e : {}
    const photoUrl = photoLink(o.photoUrl)
    return {
      id: str(o.id, '', 64) || newId(),
      name: str(o.name, '', 120),
      description: str(o.description, '', 4000),
      ...(photoUrl ? { photoUrl } : {}),
    }
  })
}

/** Só aceita links https sem aspas/parênteses (a URL vai para um `background-image`, e o JSON importado não é confiável). */
function photoLink(v: unknown): string {
  return typeof v === 'string' && v.length <= 1000 && /^https:\/\/[^\s"'()\\]+$/.test(v) ? v : ''
}

function color(v: unknown): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : DEFAULT_ACCENT
}

export function normalizeSheet(raw: unknown): SheetData {
  const d = createDefaultSheet('pirata')
  const o = isObj(raw) ? raw : {}
  const stats = isObj(o.stats) ? o.stats : {}
  const powers = isObj(o.powers) ? o.powers : {}
  const theme = isObj(o.theme) ? o.theme : {}
  const klass: KlassId = o.klass === 'marinha' || o.klass === 'outros' || o.klass === 'pirata' ? o.klass : 'pirata'
  const mode: ThemeMode = theme.mode === 'light' ? 'light' : 'dark'
  const fruits = entries(o.fruits)

  return {
    version: 1,
    photoUrl: photoLink(o.photoUrl),
    name: str(o.name, '', 80),
    age: str(o.age, '', 20),
    height: str(o.height, '', 20),
    weight: str(o.weight, '', 20),
    klass,
    rank: str(o.rank, '', 80),
    bounty: num(o.bounty, 0, 0, 999_999_999_999_999),
    race: str(o.race, '', 60),
    level: num(o.level, 0, 0, 9999),
    fruitLevel: num(o.fruitLevel, 0, 0, 9999),
    hakiLevel: num(o.hakiLevel, 0, 0, 9999),
    hp: resource(o.hp, d.hp),
    stamina: resource(o.stamina, d.stamina),
    sanity: resource(o.sanity, d.sanity),
    stats: {
      forca: num(stats.forca, 0),
      velocidade: num(stats.velocidade, 0),
      resistencia: num(stats.resistencia, 0),
      carisma: num(stats.carisma, 0),
      foco: num(stats.foco, 0),
      inteligencia: num(stats.inteligencia, 0),
    },
    powers: {
      fruta: num(powers.fruta, 0),
      hakiRei: num(powers.hakiRei, 0),
      hakiObservacao: num(powers.hakiObservacao, 0),
      hakiArmamento: num(powers.hakiArmamento, 0),
    },
    fruits: fruits.length || Array.isArray(o.fruits) ? fruits : d.fruits,
    hakis: entries(o.hakis),
    accessories: entries(o.accessories),
    theme: { accent: color(theme.accent), mode },
  }
}

// ---------- import / export ----------

export function exportSheet(data: SheetData): void {
  const blob = new Blob([JSON.stringify({ app: 'ficha-onepiece', ...data }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (data.name || 'ficha').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ficha'
  a.href = url
  a.download = `ficha-${slug}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseImport(text: string): SheetData {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  if (!isObj(json) || (json.version !== 1 && !('stats' in json) && !('name' in json))) {
    throw new Error('Esse JSON não parece uma ficha deste app.')
  }
  return normalizeSheet(json)
}

// ---------- formatação / utilidades ----------

export function formatBerry(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString('pt-BR')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Preto ou branco, o que contrastar melhor com a cor de destaque escolhida. */
export function onColor(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0b0b0c' : '#ffffff'
}

/** Reduz a foto (lado maior = 800px) e devolve um JPEG leve para enviar ao Storage. */
export async function resizeImage(file: File, maxSide = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao converter a imagem.'))), 'image/jpeg', 0.86),
  )
}
