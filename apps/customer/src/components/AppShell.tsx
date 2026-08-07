import { NavLink, Outlet, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/services', label: '서비스', icon: GridIcon },
  { to: '/history', label: '내역', icon: ListIcon },
  { to: '/chat', label: '상담', icon: ChatIcon },
  { to: '/me', label: '마이', icon: UserIcon },
]

export function AppShell() {
  const location = useLocation()
  const hideNav =
    location.pathname.includes('/booking') ||
    location.pathname.includes('/matching') ||
    location.pathname.includes('/detail') ||
    location.pathname.includes('/payment')

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <div className="phone-glow" aria-hidden />
        <main className={`phone-screen ${hideNav ? 'no-nav' : ''}`}>
          <Outlet />
        </main>
        {!hideNav && (
          <nav className="bottom-nav" aria-label="주요 메뉴">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <tab.icon />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 18l2-2h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v11z" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 12.5-3.5 14 0" />
    </svg>
  )
}
