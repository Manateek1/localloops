import { useEffect, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, MapPin, Save, UserRound } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { INTEREST_OPTIONS, US_STATES, type Profile } from '../data/models'
import type { Database } from '../lib/supabase/database.types'

type AccountPageProps = {
  client: SupabaseClient<Database> | null
  userId: string
  profile: Profile | null
  variant?: 'account' | 'onboarding'
  initialInterests?: string[]
  onSave: (profile: Profile) => void
  onComplete?: (profile: Profile) => void
}

export function AccountPage({ client, userId, profile, variant = 'account', initialInterests = [], onSave, onComplete }: AccountPageProps) {
  const onboarding = variant === 'onboarding'
  const [name, setName] = useState(profile?.display_name ?? '')
  const [region, setRegion] = useState(profile?.home_region ?? '')
  const [stateCode, setStateCode] = useState(profile?.state_code ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [interests, setInterests] = useState(profile?.interests?.length ? profile.interests : initialInterests)
  const [discoverable, setDiscoverable] = useState(profile?.discoverable ?? true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(profile?.display_name ?? '')
    setRegion(profile?.home_region ?? '')
    setStateCode(profile?.state_code ?? '')
    setBio(profile?.bio ?? '')
    setInterests(profile?.interests?.length ? profile.interests : initialInterests)
    setDiscoverable(profile?.discoverable ?? true)
  }, [profile])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    setMessage('')
    setError('')
    if (onboarding && !region.trim()) {
      setBusy(false)
      setError('Add your town or broad region so Leafy can start with the right place.')
      return
    }
    if (onboarding && !stateCode) {
      setBusy(false)
      setError('Choose a state so LocalLoops can find plans near you.')
      return
    }
    const result = await client.from('localloops_profiles').upsert({
      id: userId,
      display_name: name.trim(),
      home_region: region.trim() || null,
      state_code: stateCode || null,
      bio: bio.trim() || null,
      interests,
      discoverable,
    }).select('*').single()
    setBusy(false)
    if (result.error || !result.data) {
      setError(result.error?.message ?? 'We could not save your profile.')
      return
    }
    onSave(result.data as Profile)
    if (onboarding) {
      const { error: onboardingError } = await client.auth.updateUser({ data: { localloops_onboarding_complete: true } })
      if (onboardingError) {
        setError('Your profile was saved, but setup could not finish. Please try again.')
        return
      }
      onComplete?.(result.data as Profile)
      return
    }
    setMessage('Your profile is up to date.')
  }

  return (
    <div className="greet-page greet-account-page">
      <div className="greet-page-heading">
        <p className="greet-eyebrow">{onboarding ? 'A good place to begin' : 'A profile that feels like you'}</p>
        <h1>{onboarding ? 'Let’s get to know you.' : 'Make yourself at home.'}</h1>
        <p>{onboarding ? 'Choose a few interests and a broad home area. You can change them any time.' : 'Share just enough for a neighbor to find a common thread.'}</p>
      </div>
      <form className="greet-account-form" onSubmit={submit}>
        <label>Display name<span className="greet-input"><UserRound size={17} /><input autoComplete="name" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></span></label>
        <label>{onboarding ? 'Town or broad region' : 'Town or broad region'}<span className="greet-input"><MapPin size={17} /><input maxLength={100} required={onboarding} value={region} onChange={(event) => setRegion(event.target.value)} placeholder="For example, McCook" /></span><small>Use a town or county, not a street address. Your exact location is not saved.</small></label>
        <label>State for local discovery<select required={onboarding} value={stateCode} onChange={(event) => setStateCode(event.target.value)}><option value="">Choose a state</option>{US_STATES.map(([code, stateName]) => <option key={code} value={code}>{stateName}</option>)}</select><small>This helps Leafy search broadly nearby. It does not save your coordinates.</small></label>
        <label>A little about you<textarea rows={3} maxLength={280} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What would you like a new neighbor to know?" /></label>
        <fieldset className="greet-interest-fieldset"><legend>Interests</legend><div className="greet-interest-grid">
          {INTEREST_OPTIONS.map((interest) => <button key={interest} type="button" className={interests.includes(interest) ? 'is-selected' : ''} aria-pressed={interests.includes(interest)} onClick={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}>{interests.includes(interest) && <Check size={14} />}{interest}</button>)}
        </div></fieldset>
        <button className="greet-privacy-toggle" type="button" onClick={() => setDiscoverable((value) => !value)} aria-pressed={discoverable}>
          {discoverable ? <Eye size={18} /> : <EyeOff size={18} />}
          <span><strong>{discoverable ? 'Show me in Community' : 'Keep my profile private'}</strong><small>{discoverable ? 'Signed-in members can see your name, broad region, bio, and interests.' : 'Only you can see your profile details.'}</small></span>
          <span className={`greet-switch ${discoverable ? 'is-on' : ''}`} aria-hidden="true"><i /></span>
        </button>
        {error && <p className="greet-form-message is-error" role="alert">{error}</p>}
        {message && <p className="greet-form-message" role="status">{message}</p>}
        <button className="greet-button greet-button--primary" type="submit" disabled={busy}><Save size={16} />{busy ? 'Saving…' : onboarding ? 'Continue to Explore' : 'Save profile'}</button>
      </form>
    </div>
  )
}
