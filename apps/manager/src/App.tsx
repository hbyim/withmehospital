import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BookingProvider, ManagerProvider } from '@mosimi/shared'
import { ManagerShell } from './components/ManagerShell'
import { ManagerHomePage } from './pages/ManagerHomePage'
import { ManagerRequestsPage } from './pages/ManagerRequestsPage'
import { ManagerRequestDetailPage } from './pages/ManagerRequestDetailPage'
import { ManagerJobsPage } from './pages/ManagerJobsPage'
import { ManagerJobDetailPage } from './pages/ManagerJobDetailPage'
import { ManagerMyPage } from './pages/ManagerMyPage'

export default function App() {
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
