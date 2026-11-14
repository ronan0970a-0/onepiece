import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}

/** Pergunta ao banco (função is_master) se esta conta é a do mestre. */
export function useIsMaster(userId: string | undefined) {
  const [isMaster, setIsMaster] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId) {
      setIsMaster(null)
      return
    }
    let active = true
    supabase.rpc('is_master').then(({ data, error }) => {
      if (!active) return
      setIsMaster(error ? false : Boolean(data))
    })
    return () => {
      active = false
    }
  }, [userId])

  return isMaster
}
