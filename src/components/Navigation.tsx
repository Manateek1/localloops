import { Bell, Compass, MessageCircle, Sparkles, Users } from 'lucide-react'
import type { Page } from '../data/demo'
import { Brand } from './Brand'

type NavigationProps = {
  page: Page
  unreadCount: number
  onNavigate: (page: Page) => void
  onNotifications: () => void
}

const items = [
  { page: 'explore' as const, label: 'Explore', Icon: Compass },
  { page: 'people' as const, label: 'People', Icon: Users },
  { page: 'inbox' as const, label: 'Inbox', Icon: MessageCircle },
  { page: 'ai' as const, label: 'Guide', Icon: Sparkles },
]

export function Header({ page, unreadCount, onNavigate, onNotifications }: NavigationProps) {
  const activePage = page === 'event' ? 'explore' : page === 'messages' ? 'inbox' : page

  return (
    <header className="topbar">
      <button className="brand-button" type="button" onClick={() => onNavigate('explore')} aria-label="Greet Meet home">
        <Brand />
      </button>
      <nav className="desktop-nav" aria-label="Main navigation">
        {items.map(({ page: itemPage, label, Icon }) => (
          <button
            className={`desktop-nav__item ${activePage === itemPage ? 'is-active' : ''}`}
            key={itemPage}
            type="button"
            onClick={() => onNavigate(itemPage)}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>
      <div className="topbar__actions">
        <span className="topbar__location"><span className="location-dot" /> Nearby, at your pace</span>
        <button className="icon-button notification-button" type="button" onClick={onNotifications} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <Bell size={19} strokeWidth={1.8} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>
      </div>
    </header>
  )
}

export function BottomNav({ page, onNavigate, unreadCount }: Pick<NavigationProps, 'page' | 'onNavigate' | 'unreadCount'>) {
  const activePage = page === 'event' ? 'explore' : page === 'messages' ? 'inbox' : page

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ page: itemPage, label, Icon }) => (
        <button
          className={`bottom-nav__item ${activePage === itemPage ? 'is-active' : ''}`}
          key={itemPage}
          type="button"
          onClick={() => onNavigate(itemPage)}
          aria-current={activePage === itemPage ? 'page' : undefined}
        >
          <span className="bottom-nav__icon-wrap">
            <Icon size={20} strokeWidth={1.9} />
            {itemPage === 'inbox' && unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
