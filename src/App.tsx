import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ManagerShell } from './components/ManagerShell'
import { BookingProvider } from './store/BookingContext'
import { ManagerProvider } from './store/ManagerContext'
import { PortalPage } from './pages/PortalPage'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'
import { BookingPage } from './pages/BookingPage'
import { MatchingPage } from './pages/MatchingPage'
import { DetailPage } from './pages/DetailPage'
import { HistoryPage } from './pages/HistoryPage'
import { ChatPage } from './pages/ChatPage'
import { MyPage } from './pages/MyPage'
import { ManagerHomePage } from './pages/manager/ManagerHomePage'
import { ManagerRequestsPage } from './pages/manager/ManagerRequestsPage'
import { ManagerRequestDetailPage } from './pages/manager/ManagerRequestDetailPage'
import { ManagerJobsPage } from './pages/manager/ManagerJobsPage'
import { ManagerJobDetailPage } from './pages/manager/ManagerJobDetailPage'
import { ManagerMyPage } from './pages/manager/ManagerMyPage'

export default function App() {
  return (
    <BookingProvider>
      <ManagerProvider>
        <HashRouter>
          <Routes>
            <Route index element={<PortalPage />} />

            <Route path="app" element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="booking/:serviceId" element={<BookingPage />} />
              <Route path="matching/:bookingId" element={<MatchingPage />} />
              <Route path="detail/:bookingId" element={<DetailPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="me" element={<MyPage />} />
            </Route>

            <Route path="manager" element={<ManagerShell />}>
              <Route index element={<ManagerHomePage />} />
              <Route path="requests" element={<ManagerRequestsPage />} />
              <Route
                path="requests/:bookingId"
                element={<ManagerRequestDetailPage />}
              />
              <Route path="jobs" element={<ManagerJobsPage />} />
              <Route path="jobs/:bookingId" element={<ManagerJobDetailPage />} />
              <Route path="me" element={<ManagerMyPage />} />
            </Route>

            {/* 이전 경로 호환 */}
            <Route path="services" element={<Navigate to="/app/services" replace />} />
            <Route path="history" element={<Navigate to="/app/history" replace />} />
            <Route path="chat" element={<Navigate to="/app/chat" replace />} />
            <Route path="me" element={<Navigate to="/app/me" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ManagerProvider>
    </BookingProvider>
  )
}
