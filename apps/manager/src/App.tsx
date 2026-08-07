import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  AuthProvider,
  BookingProvider,
  ManagerProvider,
  useAuth,
} from '@mosimi/shared'
import { ManagerShell } from './components/ManagerShell'
import { ManagerHomePage } from './pages/ManagerHomePage'
import { ManagerRequestsPage } from './pages/ManagerRequestsPage'
import { ManagerRequestDetailPage } from './pages/ManagerRequestDetailPage'
import { ManagerJobsPage } from './pages/ManagerJobsPage'
import { ManagerJobDetailPage } from './pages/ManagerJobDetailPage'
import { ManagerMyPage } from './pages/ManagerMyPage'
import { ManagerLoginPage } from './pages/ManagerLoginPage'

function AuthedApp() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-shell manager-mode">
        <div className="phone-frame manager-frame">
          <div className="page matching-page">
            <p className="brand-inline manager-brand">모시미+ 매니저</p>
            <p className="muted">불러오는 중…</p>
          </div>
        </div>
      </div>
    )
  }
  if (!user) return <ManagerLoginPage />

  return (
    <BookingProvider>
      <ManagerProvider>
        <HashRouter>
          <Routes>
            <Route element={<ManagerShell />}>
              <Route index element={<ManagerHomePage />} />
              <Route path="requests" element={<ManagerRequestsPage />} />
              <Route
                path="requests/:bookingId"
                element={<ManagerRequestDetailPage />}
              />
              <Route path="jobs" element={<ManagerJobsPage />} />
              <Route path="jobs/:bookingId" element={<ManagerJobDetailPage />} />
              <Route path="me" element={<ManagerMyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ManagerProvider>
    </BookingProvider>
  )
}

export default function App() {
  return (
    <AuthProvider expectedRole="manager" storageKey="mosimi-auth-token-manager">
      <AuthedApp />
    </AuthProvider>
  )
}
