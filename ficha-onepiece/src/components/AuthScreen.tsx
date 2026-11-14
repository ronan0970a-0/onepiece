import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'in') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
        if (err) throw err
        if (!data.session) setInfo('Conta criada! Confirme o email que enviamos e depois entre.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      setError(
        /invalid login/i.test(msg)
          ? 'Email ou senha incorretos (ou o email ainda não foi confirmado).'
          : /already registered/i.test(msg)
            ? 'Este email já tem conta. Use “Entrar”.'
            : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app auth" data-theme="pirata" data-mode="dark">
      <form className="auth-card" onSubmit={submit}>
        <h1>Ficha RPG</h1>
        <p className="muted center">One Piece · Diário de bordo</p>

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}

        <button type="submit" className="btn primary big" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'in' ? 'Não tenho conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  )
}
