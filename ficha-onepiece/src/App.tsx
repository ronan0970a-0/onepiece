import { AuthScreen } from './components/AuthScreen'
import { ClassPicker } from './components/ClassPicker'
import { MasterPanel } from './components/MasterPanel'
import { SheetView } from './components/SheetView'
import { useIsMaster, useSession } from './hooks/useAuth'
import { useOwnSheetId } from './hooks/useSheet'
import { isConfigured, supabase } from './lib/supabase'
import { useState } from 'react'

function Splash({ text = 'Carregando…' }: { text?: string }) {
  return (
    <div className="app" data-theme="pirata" data-mode="dark">
      <div className="splash">
        <p>{text}</p>
      </div>
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="app" data-theme="pirata" data-mode="dark">
      <div className="auth-card">
        <h1>Falta configurar</h1>
        <p>
          Crie o arquivo <code>.env.local</code> (veja <code>.env.example</code>) com <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Na Vercel, cadastre as mesmas duas variáveis em Settings → Environment Variables e
          faça um novo deploy.
        </p>
      </div>
    </div>
  )
}

const signOut = () => void supabase.auth.signOut()

function PlayerApp({ userId, email }: { userId: string; email?: string }) {
  const { sheetId, loading, error, create } = useOwnSheetId(userId)
  const [creating, setCreating] = useState(false)

  if (loading) return <Splash text="Carregando sua ficha…" />
  if (!sheetId) {
    return (
      <ClassPicker
        email={email}
        busy={creating}
        error={error}
        onSignOut={signOut}
        onPick={async (k) => {
          setCreating(true)
          await create(k)
          setCreating(false)
        }}
      />
    )
  }
  return <SheetView sheetId={sheetId} userId={userId} email={email} canRoll onSignOut={signOut} />
}

function Authed({ userId, email }: { userId: string; email?: string }) {
  const isMaster = useIsMaster(userId)
  if (isMaster === null) return <Splash />
  return isMaster ? <MasterPanel userId={userId} email={email} onSignOut={signOut} /> : <PlayerApp userId={userId} email={email} />
}

export default function App() {
  const { session, loading } = useSession()
  if (!isConfigured) return <SetupNotice />
  if (loading) return <Splash />
  if (!session) return <AuthScreen />
  return <Authed key={session.user.id} userId={session.user.id} email={session.user.email} />
}
