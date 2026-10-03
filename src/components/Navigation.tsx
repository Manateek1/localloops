import { Compass, MessageCircle, UserRound, Users } from 'lucide-react'
import { Brand } from './Brand'
import { LanguagePicker } from '../features/LanguageProvider'

export type Page = 'explore' | 'community' | 'inbox' | 'account' | 'event' | 'messages'

type NavigationProps = {
  page: Page
  userName: string | null
  onNavigate: (page: Page) => void
  onSignIn: () => void
  onSignOut: () => void
}

const items = [
  { page: 'explore' as const, label: 'Explore', Icon: Compass },
  { page: 'community' as const, label: 'Community', Icon: Users },
  { page: 'inbox' as const, label: 'Inbox', Icon: MessageCircle },
]

function activeFor(page: Page): Page {
  if (page === 'event') return 'explore'
  if (page === 'messages') return 'inbox'
  return page
}

export function Header({ page, userName, onNavigate, onSignIn, onSignOut }: NavigationProps) {
  const activePage = activeFor(page)
  return (
    <header className="greet-header">
      <button className="greet-header__brand" type="button" onClick={() => onNavigate('explore')} aria-label="GreetMe home"><Brand /></button>
      <nav className="greet-nav" aria-label="Main navigation">
        {items.map(({ page: itemPage, label, Icon }) => (
          <button className={`greet-nav__item ${activePage === itemPage ? 'is-active' : ''}`} key={itemPage} type="button" onClick={() => onNavigate(itemPage)}>
            <Icon size={17} strokeWidth={1.8} />{label}
          </button>
        ))}
      </nav>
      <div className="greet-header__actions">
        <LanguagePicker />
        {userName ? (
          <>
            <button className={`greet-account-link ${activePage === 'account' ? 'is-active' : ''}`} type="button" onClick={() => onNavigate('account')}><UserRound size={16} /><span translate="no">{userName}</span></button>
            <button className="greet-signout" type="button" onClick={onSignOut}>Sign out</button>
          </>
        ) : <button className="greet-signin" type="button" onClick={onSignIn}>Sign in</button>}
      </div>
    </header>
  )
}

export function BottomNav({ page, userName, onNavigate, onSignIn }: Pick<NavigationProps, 'page' | 'userName' | 'onNavigate' | 'onSignIn'>) {
  const activePage = activeFor(page)
  return (
    <nav className="greet-bottom-nav" aria-label="Main navigation">
      {items.map(({ page: itemPage, label, Icon }) => (
        <button className={`greet-bottom-nav__item ${activePage === itemPage ? 'is-active' : ''}`} key={itemPage} type="button" onClick={() => onNavigate(itemPage)} aria-current={activePage === itemPage ? 'page' : undefined}>
          <Icon size={20} strokeWidth={1.9} /><span>{label}</span>
        </button>
      ))}
      {userName
        ? <button className={`greet-bottom-nav__item ${activePage === 'account' ? 'is-active' : ''}`} type="button" onClick={() => onNavigate('account')}><UserRound size={20} /><span>Profile</span></button>
        : <button className="greet-bottom-nav__item" type="button" onClick={onSignIn}><UserRound size={20} /><span>Sign in</span></button>}
    </nav>
  )
}
