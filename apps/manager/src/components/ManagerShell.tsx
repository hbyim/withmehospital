import { NavLink, Outlet, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈', icon: HomeIcon, end: true },
  { to: '/requests', label: '요청', icon: BellIcon, end: false },
  { to: '/jobs', label: '일정', icon: CalendarIcon, end: false },
  { to: '/me', label: '마이', icon: UserIcon, end: false },
]

export function ManagerShell() {
  const location = useLocation()
  const hideNav =
    location.pathname.includes('/requests/') ||
    location.pathname.includes('/jobs/')

  return (
    <div className="app-shell manager-mode">
      <div className="phone-frame manager-frame">
        <div className="phone-glow manager-glow" aria-hidden />
        <div className="frame-layout">
          {!hideNav && (
            <aside className="sidebar-nav manager-sidebar" aria-label="매니저 메뉴">
              <p className="sidebar-brand manager-brand">모시미+ 매니저</p>
              <p className="sidebar-tagline">요청 수락·일정 관리</p>
              <div className="sidebar-links">
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <tab.icon />
                    <span>{tab.label}</span>
                  </NavLink>
                ))}
              </div>
            </aside>
          )}
          <div className="frame-main">
            <main className={`phone-screen ${hideNav ? 'no-nav' : ''}`}>
              <Outlet />
            </main>
            {!hideNav && (
              <nav className="bottom-nav manager-nav" aria-label="매니저 메뉴">
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
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
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
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
