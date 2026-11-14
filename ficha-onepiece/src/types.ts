export type KlassId = 'pirata' | 'marinha' | 'outros'

export interface Entry {
  id: string
  name: string
  description: string
  /** Foto opcional (usada em frutas e acessórios). */
  photoUrl?: string
}

export interface Resource {
  current: number
  max: number
}

export interface Stats {
  forca: number
  velocidade: number
  resistencia: number
  carisma: number
  foco: number
  inteligencia: number
}

export interface Powers {
  fruta: number
  hakiRei: number
  hakiObservacao: number
  hakiArmamento: number
}

export type ThemeMode = 'dark' | 'light'

export interface SheetData {
  version: 1
  photoUrl: string
  name: string
  age: string
  height: string
  weight: string
  klass: KlassId
  rank: string // patente
  bounty: number // recompensa (berries)
  race: string
  level: number
  fruitLevel: number
  hakiLevel: number
  hp: Resource
  stamina: Resource
  sanity: Resource
  stats: Stats
  powers: Powers
  fruits: Entry[]
  hakis: Entry[]
  accessories: Entry[]
  /** Só é usado pela classe "Outros". */
  theme: { accent: string; mode: ThemeMode }
}

export interface SheetRow {
  id: string
  owner: string
  name: string
  klass: KlassId
  bounty: number
  data: SheetData
  updated_at: string
  updated_by: string | null
}

export interface RollRow {
  id: number
  sheet_id: string | null
  owner: string
  character_name: string
  label: string
  dice_count: number
  dice_sides: number
  modifier: number
  results: number[]
  total: number
  created_at: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
