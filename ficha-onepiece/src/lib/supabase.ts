import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// Se faltar a configuração, o app mostra uma tela de aviso em vez de quebrar.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key')
