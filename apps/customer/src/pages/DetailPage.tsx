import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiClientError,
  bookingStatusLabel,
  formatPrice,
  paymentStatusLabel,
  startBookingPayment,
  useBooking,
} from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

export function DetailPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const {
    bookings,
    loading,
    updateBooking,
    refreshBookings,
    getBooking,
  } = useBooking()
  const [booking, setBooking] = useState(
    () => bookings.find((b) => b.id === bookingId) ?? null,
  )
  const [paying, setPaying] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const local = bookings.find((b) => b.id === bookingId)
    if (local) setBooking(local)
  }, [bookings, bookingId])

  useEffect(() => {
    if (!bookingId || booking) return
    let cancelled = false
    void getBooking(bookingId)
      .then((b) => {
        if (!cancelled) setBooking(b)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '예약을 불러오지 못했습니다.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, booking, getBooking])

  if (loading && !booking) {
    return (
      <div className="page">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="page">
        <p>{error || '예약을 찾을 수 없습니다.'}</p>
        <Link to="/history">내역으로</Link>
      </div>
    )
  }

  const canPay =
    ['matched', 'confirmed', 'in_progress', 'completed'].includes(
      booking.status,
    ) &&
    booking.paymentStatus !== 'paid' &&
    booking.paymentStatus !== 'pending'

  const onAction = async (status: 'confirmed' | 'cancelled') => {
    setActionPending(true)
    setError(null)
    try {
      const next = await updateBooking(booking.id, { status })
      setBooking(next)
    } catch (e) {
      setError(
        e instanceof ApiClientError || e instanceof Error
          ? e.message
          : '상태 변경 실패',
      )
    } finally {
      setActionPending(false)
    }
  }

  const onPay = async () => {
    setPaying(true)
    setError(null)
    try {
      const result = await startBookingPayment(booking.id)
      if (result?.booking) {
        setBooking(result.booking)
        await refreshBookings()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제 실패')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="page detail-page">
      <header className="sub-header">
        <button type="button" className="back" onClick={() => navigate('/history')}>
          ←
        </button>
        <div>
          <p className="brand-inline">위드유</p>
          <h1>예약 상세</h1>
        </div>
      </header>

      <div className={`status-pill ${booking.status}`}>
        {bookingStatusLabel[booking.status]}
      </div>

      <section className="detail-block">
        <h2>{booking.service.name}</h2>
        <p>
          {booking.date} {booking.time} · {booking.durationHours}시간
        </p>
        <p>
          {booking.pickup} → {booking.destination}
        </p>
        <p>이용 대상: {booking.careTarget}</p>
        {booking.note && <p>요청: {booking.note}</p>}
        <strong className="price">{formatPrice(booking.price)}</strong>
        <p className="muted small">
          결제:{' '}
          <span className={`badge pay-${booking.paymentStatus ?? 'unpaid'}`}>
            {paymentStatusLabel[booking.paymentStatus ?? 'unpaid']}
          </span>
        </p>
      </section>

      {booking.manager && (
        <section className="manager-card animate-fade-up">
          <div
            className="avatar"
            style={{ background: booking.manager.color }}
          >
            {booking.manager.name.slice(0, 1)}
          </div>
          <div>
            <h3>{booking.manager.name} 매니저</h3>
            <p>
              ★ {booking.manager.rating} ({booking.manager.reviews}) · 경력{' '}
              {booking.manager.experienceYears}년 ·{' '}
              {booking.manager.distanceKm}km
            </p>
            <p className="muted">{booking.manager.bio}</p>
            <div className="tags">
              {booking.manager.specialties.map((s: string) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="action-stack">
        {error && <p className="form-error">{error}</p>}
        {booking.status === 'matching' && (
          <Link to={`/matching/${booking.id}`} className="btn primary block">
            매니저 수락 대기 화면
          </Link>
        )}
        {booking.status === 'matched' && (
          <button
            type="button"
            className="btn primary block"
            disabled={actionPending}
            onClick={() => void onAction('confirmed')}
          >
            {actionPending ? '처리 중…' : '예약 확정하기'}
          </button>
        )}
        {booking.status === 'confirmed' && (
          <p className="muted small">
            매니저가 서비스를 시작하면 진행 상태로 바뀝니다.
          </p>
        )}
        {booking.status === 'in_progress' && (
          <p className="muted small">서비스가 진행 중입니다.</p>
        )}
        {booking.status === 'completed' && booking.paymentStatus !== 'paid' && (
          <p className="muted small">이용이 완료되었습니다. 결제를 진행해 주세요.</p>
        )}
        {booking.paymentStatus === 'pending' && (
          <p className="muted small">결제가 진행 중입니다.</p>
        )}
        {canPay && (
          <button
            type="button"
            className="btn primary block"
            disabled={paying}
            onClick={() => void onPay()}
          >
            {paying ? '결제 진행 중…' : `${formatPrice(booking.price)} 결제하기`}
          </button>
        )}
        {booking.paymentStatus === 'paid' && (
          <p className="muted small">결제가 완료되었습니다.</p>
        )}
        {!['completed', 'cancelled'].includes(booking.status) &&
          booking.paymentStatus !== 'paid' && (
            <button
              type="button"
              className="btn ghost block"
              disabled={actionPending}
              onClick={() => void onAction('cancelled')}
            >
              예약 취소
            </button>
          )}
        <a href={MANAGER_APP_URL} className="btn ghost block">
          매니저 앱 열기
        </a>
        <Link to="/chat" className="btn ghost block">
          상담 챗봇 열기
        </Link>
      </div>
    </div>
  )
}
