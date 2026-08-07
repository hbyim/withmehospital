import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, BookingProvider, useAuth } from '@mosimi/shared'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'
import { BookingPage } from './pages/BookingPage'
import { MatchingPage } from './pages/MatchingPage'
import { DetailPage } from './pages/DetailPage'
import { HistoryPage } from './pages/HistoryPage'
import { ChatPage } from './pages/ChatPage'
import { MyPage } from './pages/MyPage'
import { CustomerLoginPage } from './pages/LoginPage'
import { PaymentFailPage, PaymentSuccessPage } from './pages/PaymentResultPage'

function AuthedApp() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <div className="page matching-page">
            <p className="brand-inline">모시미+</p>
            <p className="muted">불러오는 중…</p>
          </div>
        </div>
      </div>
    )
  }
  if (!user) return <CustomerLoginPage />

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
            <Route path="payment/success" element={<PaymentSuccessPage />} />
            <Route path="payment/fail" element={<PaymentFailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </BookingProvider>
  )
}

export default function App() {
  return (
    <AuthProvider expectedRole="customer" storageKey="mosimi-auth-token-customer">
      <AuthedApp />
    </AuthProvider>
  )
}
