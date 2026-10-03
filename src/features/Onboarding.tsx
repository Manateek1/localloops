import {
  Bike,
  Building2,
  Camera,
  Flower2,
  Music2,
  Palette,
  Mountain,
  Trees,
  UtensilsCrossed,
  Waves,
} from 'lucide-react'
import type { CommunityMode } from '../data/demo'
import { interestOptions } from '../data/demo'
import { Brand } from '../components/Brand'

const interestIcons = {
  bike: Bike,
  mountain: Mountain,
  utensils: UtensilsCrossed,
  music: Music2,
  palette: Palette,
  flower: Flower2,
  waves: Waves,
  camera: Camera,
}

type OnboardingProps = {
  mode: CommunityMode
  interests: string[]
  onModeChange: (mode: CommunityMode) => void
  onInterestToggle: (interest: string) => void
  onContinue: () => void
}

export function Onboarding({ mode, interests, onModeChange, onInterestToggle, onContinue }: OnboardingProps) {
  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <Brand />
      </header>
      <div className="onboarding-layout">
        <section className="onboarding-content">
          <div className="onboarding-heading">
            <h1>Meet people.<br /><em>Discover events.</em></h1>
            <p>Explore what you love.</p>
          </div>

          <section className="onboarding-section" aria-labelledby="interests-heading">
            <div className="section-heading-row">
              <div>
                <h2 id="interests-heading">What are you into?</h2>
                <p>Choose a few interests to get started.</p>
              </div>
            </div>
            <div className="interest-grid">
              {interestOptions.map((interest) => {
                const Icon = interestIcons[interest.icon as keyof typeof interestIcons]
                const selected = interests.includes(interest.label)
                return (
                  <button
                    className={`interest-tile ${selected ? 'is-selected' : ''}`}
                    key={interest.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onInterestToggle(interest.label)}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{interest.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="onboarding-section onboarding-section--mode" aria-labelledby="mode-heading">
            <div className="section-heading-row">
              <div>
                <h2 id="mode-heading">Where do you want to meet people?</h2>
                <p>You can explore both whenever you like.</p>
              </div>
            </div>
            <div className="mode-grid">
              <button className={`mode-tile ${mode === 'city' ? 'is-selected' : ''}`} type="button" onClick={() => onModeChange('city')} aria-pressed={mode === 'city'}>
                <span className="mode-tile__icon mode-tile__icon--city"><Building2 size={27} strokeWidth={1.7} /></span>
                <span className="mode-tile__copy"><strong>City</strong><small>Big cities &amp; metro areas</small></span>
              </button>
              <button className={`mode-tile ${mode === 'rural' ? 'is-selected' : ''}`} type="button" onClick={() => onModeChange('rural')} aria-pressed={mode === 'rural'}>
                <span className="mode-tile__icon"><Trees size={27} strokeWidth={1.7} /></span>
                <span className="mode-tile__copy"><strong>Rural communities</strong><small>Small towns, local events, wider reach</small></span>
              </button>
            </div>
          </section>

          <button className="button button--primary onboarding-continue" type="button" onClick={onContinue}>
            Continue
          </button>
          <p className="onboarding-footnote">Your location stays broad. You choose what to share.</p>
        </section>

        <aside className="onboarding-art" aria-label="Neighbors enjoying the outdoors">
          <img src="/images/foothill-hike.png" alt="Neighbors hiking together on a wooded trail" />
        </aside>
      </div>
    </main>
  )
}
