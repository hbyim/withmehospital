import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { BookingProvider } from './store/BookingContext'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'
import { BookingPage } from './pages/BookingPage'
import { MatchingPage } from './pages/MatchingPage'
import { DetailPage } from './pages/DetailPage'
import { HistoryPage } from './pages/HistoryPage'
import { ChatPage } from './pages/ChatPage'
import { MyPage } from './pages/MyPage'

export default function App() {
  return (
    <BookingProvider>
      {/* HashRouter: GitHub Pages에서 SPA 라우팅이 안정적으로 동작 */}
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="booking/:serviceId" element={<BookingPage />} />
            <Route path="matching/:bookingId" element={<MatchingPage />} />
            <Route path="detail/:bookingId" element={<DetailPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="me" element={<MyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </BookingProvider>
  )
}
