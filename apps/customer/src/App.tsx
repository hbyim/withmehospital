import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BookingProvider } from '@mosimi/shared'
import { AppShell } from './components/AppShell'
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
