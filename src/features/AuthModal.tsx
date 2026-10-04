import { useState, type FormEvent } from 'react'
import { ArrowLeft, Leaf, LockKeyhole, Mail } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'

type AuthModalProps = {
  client: SupabaseClient<Database> | null
  onClose: () => void
}

export function AuthModal({ client, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!client) {
      setError('Sign-in is not connected yet. The team needs to add the LocalLoops Supabase project URL and publishable key.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'create') {
        const { data, error: signupError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { localloops_app: true },
          },
        })
        if (signupError) throw signupError
        if (!data.session) throw new Error('Your account was created, but this project did not sign you in. Email confirmation must be turned off.')
        onClose()
      } else {
        const { error: signinError } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (signinError) throw signinError
        onClose()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not complete sign-in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="greet-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="greet-auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="greet-modal-back" type="button" onClick={onClose}><ArrowLeft size={16} /> Back to LocalLoops</button>
        <div className="greet-auth-card__mark"><Leaf size={20} /></div>
        <p className="greet-eyebrow">A little closer to community</p>
        <h2 id="auth-title">{!client ? 'Account access is coming soon.' : mode === 'sign-in' ? 'Welcome back.' : 'Come on in.'}</h2>
        <p className="greet-auth-card__copy">{!client ? 'LocalLoops is preparing its member accounts.' : mode === 'sign-in' ? 'Sign in to save your plans and meet real neighbors.' : 'Create an account to RSVP, host a gathering, and meet neighbors.'}</p>

        {!client ? <div className="greet-auth-setup" role="status"><Leaf size={18} /><p>The Supabase connection is not configured on this deployment yet. The team can enable sign-in once the LocalLoops project is connected.</p></div> : <>
          <div className="greet-auth-switch" role="tablist" aria-label="Account action">
            <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'is-active' : ''} onClick={() => { setMode('sign-in'); setError(''); setMessage('') }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'is-active' : ''} onClick={() => { setMode('create'); setError(''); setMessage('') }}>Create account</button>
          </div>

          <form className="greet-form" onSubmit={submit}>
            <label>Email address<span className="greet-input"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label>
            <label>Password<span className="greet-input"><LockKeyhole size={17} /><input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'} /></span></label>
            {error && <p className="greet-form-message is-error" role="alert">{error}</p>}
            {message && <p className="greet-form-message" role="status">{message}</p>}
            <button className="greet-button greet-button--primary greet-auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'sign-in' ? 'Sign in' : 'Create my account'}</button>
          </form>
          <p className="greet-auth-card__privacy">Your profile shows only the details you choose to share. LocalLoops never stores a home address.</p>
        </>}
      </section>
    </div>
  )
}
