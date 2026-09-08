import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiClientError,
  BookingTrackingPanel,
  bookingStatusLabel,
  formatPrice,
  getPaymentConfig,
  paymentStatusLabel,
  refundBookingPayment,
  startBookingPayment,
  useBooking,
  type TossMethod,
} from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

const DEFAULT_METHODS: Array<{ id: TossMethod; label: string }> = [
  { id: 'CARD', label: '신용·체크카드' },
  { id: 'TOSSPAY', label: '토스페이' },
  { id: 'TRANSFER', label: '계좌이체' },
  { id: 'PHONE', label: '휴대폰' },
]

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
  const [payMethod, setPayMethod] = useState<TossMethod>('CARD')
  const [methods, setMethods] = useState(DEFAULT_METHODS)
  const [payMode, setPayMode] = useState<'toss' | 'stub'>('stub')

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

  useEffect(() => {
    let cancelled = false
    void getPaymentConfig()
      .then((cfg) => {
        if (cancelled) return
        setPayMode(cfg.mode)
        if (cfg.methods?.length) setMethods(cfg.methods)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

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
    booking.paymentStatus !== 'refunded'

  const canTrack = Boolean(booking.trackingAvailable)

  const onAction = async (status: 'confirmed' | 'cancelled') => {
    if (status === 'cancelled' && booking.paymentStatus === 'paid') {
      const ok = window.confirm(
        '결제된 예약입니다. 취소 시 자동 환불됩니다. 계속할까요?',
      )
      if (!ok) return
    }
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
      const result = await startBookingPayment(booking.id, payMethod)
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

  const onRefund = async () => {
    const ok = window.confirm('결제를 환불할까요?')
    if (!ok) return
    setActionPending(true)
    setError(null)
    try {
      const data = await refundBookingPayment(booking.id, '고객 요청 환불')
      setBooking(data.booking)
      await refreshBookings()
    } catch (e) {
      setError(e instanceof Error ? e.message : '환불 실패')
    } finally {
      setActionPending(false)
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

      {canTrack && bookingId && (
        <BookingTrackingPanel bookingId={bookingId} enabled />
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

        {canPay && (
          <section className="pay-methods">
            <p className="muted small">
              결제 수단
              {payMode === 'stub' ? ' (데모 stub)' : ' (토스페이먼츠)'}
            </p>
            <div className="pay-method-grid">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pay-method ${payMethod === m.id ? 'active' : ''}`}
                  onClick={() => setPayMethod(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn primary block"
              disabled={paying}
              onClick={() => void onPay()}
            >
              {paying
                ? '결제 진행 중…'
                : `${formatPrice(booking.price)} 결제하기`}
            </button>
          </section>
        )}

        {booking.paymentStatus === 'paid' && (
          <>
            <p className="muted small">결제가 완료되었습니다.</p>
            {['matched', 'confirmed'].includes(booking.status) && (
              <button
                type="button"
                className="btn ghost block"
                disabled={actionPending}
                onClick={() => void onRefund()}
              >
                결제 환불
              </button>
            )}
          </>
        )}
        {booking.paymentStatus === 'refunded' && (
          <p className="muted small">환불이 완료되었습니다.</p>
        )}

        {!['completed', 'cancelled'].includes(booking.status) && (
          <button
            type="button"
            className="btn ghost block"
            disabled={actionPending}
            onClick={() => void onAction('cancelled')}
          >
            예약 취소
            {booking.paymentStatus === 'paid' ? ' (자동 환불)' : ''}
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
