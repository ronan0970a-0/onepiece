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

export type NpcKind = 'npc' | 'boss'

/** NPC / Boss: mesmo formato de dados da ficha, mais o tipo e se foi revelado aos jogadores. */
export interface NpcRow {
  id: string
  owner: string
  by_master: boolean
  kind: NpcKind
  revealed: boolean
  name: string
  klass: KlassId
  bounty: number
  data: SheetData
  updated_at: string
  updated_by: string | null
}

/** NPC revelado pelo mestre: só a identidade (nunca HP, status ou itens). */
export interface RevealedNpc {
  id: string
  kind: NpcKind
  name: string
  klass: KlassId
  bounty: number
  photo_url: string
  rank: string
  race: string
}

/** Linha do quadro de Procurados da Marinha (piratas jogadores + NPCs piratas revelados). */
export interface WantedEntry {
  source: 'player' | 'npc'
  id: string
  name: string
  bounty: number
  photo_url: string
  rank: string
  kind: '' | NpcKind
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
