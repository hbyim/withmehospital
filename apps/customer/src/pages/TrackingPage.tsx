import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookingTrackingPanel,
  bookingStatusLabel,
  useBooking,
} from '@mosimi/shared'

export function TrackingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings } = useBooking()
  const booking = bookings.find((b) => b.id === bookingId)

  if (!bookingId) {
    return (
      <div className="page">
        <p>예약을 찾을 수 없습니다.</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  const ended =
    booking &&
    (booking.status === 'completed' || booking.status === 'cancelled')

  return (
    <div className="page tracking-page">
      <header className="sub-header">
        <button type="button" className="back" onClick={() => navigate(-1)}>
          ←
        </button>
        <div>
          <p className="brand-inline">위드유</p>
          <h1>실시간 위치 추적</h1>
        </div>
      </header>

      {booking && (
        <section className="tracking-hero-meta">
          <div className={`status-pill ${booking.status}`}>
            {bookingStatusLabel[booking.status]}
          </div>
          <h2>{booking.service.name}</h2>
          <p className="muted">
            {booking.manager?.name ?? '매니저'} · {booking.pickup} →{' '}
            {booking.destination}
          </p>
        </section>
      )}

      {ended ? (
        <div className="empty soft">
          <p>서비스가 종료되어 위치 추적을 종료합니다.</p>
          <Link to={`/detail/${bookingId}`} className="btn primary block">
            예약 상세로
          </Link>
        </div>
      ) : (
        <>
          <p className="tracking-live-hint">
            매니저가 서비스를 시작했습니다. 아래 지도에서 위치를 확인하세요.
          </p>
          <BookingTrackingPanel
            bookingId={bookingId}
            enabled
            pollMs={5_000}
            mapHeight={360}
            compact={false}
          />
          <div className="action-stack">
            <Link to={`/detail/${bookingId}`} className="btn ghost block">
              예약 상세 보기
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
