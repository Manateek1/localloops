import { useState, type FormEvent } from 'react'
import { ArrowLeft, MapPin, Trees } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityEvent, LocationResult, Profile } from '../data/models'
import type { Database } from '../lib/supabase/database.types'
import { searchLocation } from '../lib/location'

type CreateEventModalProps = {
  client: SupabaseClient<Database>
  userId: string
  profile: Profile | null
  location: LocationResult | null
  communityId?: string | null
  onClose: () => void
  onCreated: (event: CommunityEvent) => void
}

export function CreateEventModal({ client, userId, profile, location, communityId = null, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState('')
  const [venue, setVenue] = useState('')
  const [meetingPlace, setMeetingPlace] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!meetingPlace.trim()) {
      setError('Enter the public place where the group will meet.')
      return
    }
    const startsAt = new Date(dateTime)
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setError('Choose a future date and time.')
      return
    }
    setBusy(true)
    setError('')
    let publicLocation: LocationResult
    try {
      publicLocation = await searchLocation(meetingPlace)
    } catch (lookupError) {
      setBusy(false)
      setError(lookupError instanceof Error ? lookupError.message : 'We could not locate that public meeting place.')
      return
    }
    const { data, error: insertError } = await client.from('localloops_events').insert({
      host_id: userId,
      title: title.trim(),
      description: description.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: null,
      mode: 'rural',
      visibility: 'public',
      region_label: publicLocation.city + ', ' + publicLocation.stateCode,
      venue_label: venue.trim(),
      state_code: publicLocation.stateCode,
      latitude: publicLocation.latitude,
      longitude: publicLocation.longitude,
      category: 'Community',
      source_name: 'LocalLoops community',
      source_url: null,
      community_id: communityId,
    }).select('*').single()
    setBusy(false)
    if (insertError || !data) {
      setError(insertError?.message ?? 'We could not publish your event.')
      return
    }
    onCreated({
      id: 'community:' + data.id,
      sourceId: data.id,
      source: 'community',
      sourceName: 'Community event',
      sourceUrl: null,
      title: data.title,
      description: data.description,
      startsAt: data.starts_at,
      timeLabel: null,
      venue: data.venue_label,
      city: data.region_label.split(',')[0]?.trim() ?? data.region_label,
      state: data.state_code,
      stateCode: data.state_code,
      latitude: data.latitude,
      longitude: data.longitude,
      imageUrl: null,
      category: data.category,
      isFree: true,
      distanceMiles: 0,
      communityEventId: data.id,
      hostName: profile?.display_name,
    })
  }

  return (
    <div className="greet-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="greet-compose-card" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <button className="greet-modal-back" type="button" onClick={onClose}><ArrowLeft size={16} /> Back to LocalLoops</button>
        <div className="greet-compose-icon"><Trees size={21} /></div>
        <p className="greet-eyebrow">Make room for a new hello</p>
        <h2 id="compose-title">Host a public gathering.</h2>
        <p className="greet-compose-intro">Share a real plan with neighbors{location ? ` near ${location.label}` : ' across the United States'}.</p>
        <form className="greet-form" onSubmit={submit}>
          <label>What are you planning?<input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A Saturday trail walk" /></label>
          <label>Public place name<input required minLength={2} maxLength={120} value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Town library, community hall, public trailhead…" /></label>
          <label>Public meeting address, town and state, or ZIP<input required minLength={3} maxLength={100} value={meetingPlace} onChange={(event) => setMeetingPlace(event.target.value)} placeholder="A public address, Asheville, NC, or 28801" /></label>
          <label>When?<input type="datetime-local" required value={dateTime} onChange={(event) => setDateTime(event.target.value)} /></label>
          <label>What should neighbors know?<textarea rows={4} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful details, what to bring, or how to recognize the group." /></label>
          <div className="greet-compose-location"><MapPin size={16} /><span>A street address makes a precise pin; a town or ZIP uses its approximate center.</span></div>
          <p className="greet-compose-privacy">Use a public place, never a home address. The address is geocoded to place the map pin, then discarded; the event location and place name are public.</p>
          {error && <p className="greet-form-message is-error" role="alert">{error}</p>}
          <button className="greet-button greet-button--primary greet-compose-submit" type="submit" disabled={busy}>{busy ? 'Locating and sharing…' : 'Share event with neighbors'}</button>
        </form>
      </section>
    </div>
  )
}
