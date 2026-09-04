import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiClientError,
  bookingStatusLabel,
  formatPrice,
  paymentStatusLabel,
  useBooking,
  useManager,
} from '@mosimi/shared'

export function ManagerJobDetailPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings, loading, updateBooking, getBooking } = useBooking()
  const { manager } = useManager()
  const [booking, setBooking] = useState(
    () => bookings.find((b) => b.id === bookingId) ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
          setError(e instanceof Error ? e.message : '일정을 불러오지 못했습니다.')
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

  if (!booking || booking.manager?.id !== manager.id) {
    return (
      <div className="page">
        <p>{error || '일정을 찾을 수 없거나 권한이 없습니다.'}</p>
        <Link to="/jobs">내 일정으로</Link>
      </div>
    )
  }

  const onStatus = async (status: 'in_progress' | 'completed' | 'cancelled') => {
    setPending(true)
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
      setPending(false)
    }
  }

  return (
    <div className="page detail-page">
      <header className="sub-header">
        <button
          type="button"
          className="back"
          onClick={() => navigate('/jobs')}
        >
          ←
        </button>
        <div>
          <p className="brand-inline manager-brand">위드유 매니저</p>
          <h1>일정 상세</h1>
        </div>
      </header>

      <div className={`status-pill ${booking.status}`}>
        {bookingStatusLabel[booking.status]}
      </div>

      <section className="detail-block">
        <h2>{booking.service.name}</h2>
        <p>
          고객: {booking.customerName ?? '고객'} · 대상: {booking.careTarget}
        </p>
        <p>
          {booking.date} {booking.time} · {booking.durationHours}시간
        </p>
        <p>
          {booking.pickup} → {booking.destination}
        </p>
        {booking.note && <p>요청: {booking.note}</p>}
        <strong className="price">{formatPrice(booking.price)}</strong>
        <p className="muted small">
          결제:{' '}
          <span className={`badge pay-${booking.paymentStatus ?? 'unpaid'}`}>
            {paymentStatusLabel[booking.paymentStatus ?? 'unpaid']}
          </span>
        </p>
      </section>

      <div className="action-stack">
        {error && <p className="form-error">{error}</p>}
        {booking.status === 'matched' && (
          <p className="muted small">
            고객이 앱에서 예약을 확정하면 서비스 준비가 완료됩니다.
          </p>
        )}
        {booking.status === 'confirmed' && (
          <button
            type="button"
            className="btn primary block"
            disabled={pending}
            onClick={() => void onStatus('in_progress')}
          >
            {pending ? '처리 중…' : '서비스 시작'}
          </button>
        )}
        {booking.status === 'in_progress' && (
          <button
            type="button"
            className="btn primary block"
            disabled={pending}
            onClick={() => void onStatus('completed')}
          >
            {pending ? '처리 중…' : '서비스 완료 처리'}
          </button>
        )}
        {booking.status === 'completed' && (
          <div className="empty soft">
            {booking.paymentStatus === 'paid'
              ? '완료·결제된 일정입니다. 수고하셨습니다.'
              : '완료되었습니다. 고객 결제를 기다리고 있습니다.'}
          </div>
        )}
        {!['completed', 'cancelled'].includes(booking.status) && (
          <button
            type="button"
            className="btn ghost block"
            disabled={pending}
            onClick={() => void onStatus('cancelled')}
          >
            일정 취소
          </button>
        )}
      </div>
    </div>
  )
}
