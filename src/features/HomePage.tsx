import { useState } from 'react'
import { ArrowRight, Globe2, Leaf, Sparkles } from 'lucide-react'
import { Brand } from '../components/Brand'
import { INTEREST_OPTIONS } from '../data/models'
import { LanguagePicker } from './LanguageProvider'

type HomePageProps = {
  onSignIn: () => void
  onCreateAccount: (interests: string[]) => void
}

export function HomePage({ onSignIn, onCreateAccount }: HomePageProps) {
  const [interests, setInterests] = useState<string[]>([])

  const toggleInterest = (interest: string) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest])
  }

  return (
    <div className="greet-public-home">
      <header className="greet-public-header">
        <Brand />
        <div className="greet-public-header__actions">
          <LanguagePicker />
          <button className="greet-public-signin" type="button" onClick={onSignIn}>Sign in</button>
          <button className="greet-button greet-button--primary" type="button" onClick={() => onCreateAccount(interests)}>Create account</button>
        </div>
      </header>

      <main>
        <section className="greet-public-hero" aria-labelledby="public-home-title">
          <div className="greet-public-copy">
            <h1 id="public-home-title">Find your people, close to home.</h1>
            <p className="greet-public-intro">Find real public events and community gatherings in towns, cities, and rural areas.</p>

            <fieldset className="greet-public-interests">
              <legend>What are you interested in? <span>Select any that sound good.</span></legend>
              <div className="greet-public-interest-list">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    className={interests.includes(interest) ? 'is-selected' : ''}
                    type="button"
                    key={interest}
                    aria-pressed={interests.includes(interest)}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </fieldset>

            <button className="greet-button greet-button--primary greet-public-cta" type="button" onClick={() => onCreateAccount(interests)}>
              Create account <ArrowRight size={17} />
            </button>
            <p className="greet-public-account-note">Your picks carry into account setup. You can change them any time.</p>
          </div>

          <div className="greet-home-example" aria-label="Example conversation with Leafy">
            <div className="greet-home-example__character">
              <span className="greet-home-example__sparkle" aria-hidden="true"><Sparkles size={23} /></span>
              <img src="/images/localloops-sprout.png" alt="Leafy, the LocalLoops guide" />
              <div className="greet-home-example__name"><Leaf size={15} /> Leafy</div>
            </div>
            <div className="greet-home-example__conversation">
              <p className="greet-home-example__label"><Globe2 size={14} /> Example conversation</p>
              <div className="greet-home-example__message greet-home-example__message--visitor">
                <span>You</span>
                <p>I’m hoping to find a group run near McCook, Nebraska.</p>
              </div>
              <div className="greet-home-example__message greet-home-example__message--leafy">
                <span>Leafy</span>
                <p>I’ll check LocalLoops gatherings and public events near McCook.</p>
              </div>
              <div className="greet-home-example__message greet-home-example__message--visitor">
                <span>You</span>
                <p>Show me what’s actually available.</p>
              </div>
              <p className="greet-home-example__note">Leafy shows live listings after you choose an area. No made-up events.</p>
            </div>
          </div>
        </section>

        <section className="greet-home-features" aria-label="What you can do on LocalLoops">
          <div><span>01</span><h2>Discover plans</h2><p>Look through community gatherings and public events around a town or ZIP.</p></div>
          <div><span>02</span><h2>Host a gathering</h2><p>Share a real local plan so neighbors with similar interests can find it.</p></div>
          <div><span>03</span><h2>Show you’re going</h2><p>RSVP to a plan and see who else is joining when they choose to share.</p></div>
        </section>
      </main>
      <footer className="greet-home-footer"><Brand compact /><span>Good things grow closer together.</span></footer>
    </div>
  )
}
