import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatPrice } from '@mosimi/shared'
import { useBooking, type BookingStatus } from '@mosimi/shared'
import { useManager } from '@mosimi/shared'

const statusLabel: Record<BookingStatus, string> = {
  draft: '작성 중',
  matching: '매칭 중',
  matched: '배정됨 (고객 확정 대기)',
  confirmed: '고객 확정',
  in_progress: '서비스 진행 중',
  completed: '이용 완료',
  cancelled: '취소됨',
}

export function ManagerJobDetailPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings, updateBooking } = useBooking()
  const { manager } = useManager()
  const booking = bookings.find((b) => b.id === bookingId)

  if (!booking || booking.manager?.id !== manager.id) {
    return (
      <div className="page">
        <p>일정을 찾을 수 없거나 권한이 없습니다.</p>
        <Link to="/jobs">내 일정으로</Link>
      </div>
    )
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
          <p className="brand-inline manager-brand">모시미+ 매니저</p>
          <h1>일정 상세</h1>
        </div>
      </header>

      <div className={`status-pill ${booking.status}`}>
        {statusLabel[booking.status]}
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
      </section>

      <div className="action-stack">
        {booking.status === 'matched' && (
          <p className="muted small">
            고객이 앱에서 예약을 확정하면 서비스 준비가 완료됩니다.
          </p>
        )}
        {booking.status === 'confirmed' && (
          <button
            type="button"
            className="btn primary block"
            onClick={() =>
              updateBooking(booking.id, { status: 'in_progress' })
            }
          >
            서비스 시작
          </button>
        )}
        {booking.status === 'in_progress' && (
          <button
            type="button"
            className="btn primary block"
            onClick={() =>
              updateBooking(booking.id, { status: 'completed' })
            }
          >
            서비스 완료 처리
          </button>
        )}
        {booking.status === 'completed' && (
          <div className="empty soft">완료된 일정입니다. 수고하셨습니다.</div>
        )}
        {!['completed', 'cancelled'].includes(booking.status) && (
          <button
            type="button"
            className="btn ghost block"
            onClick={() =>
              updateBooking(booking.id, { status: 'cancelled', manager })
            }
          >
            일정 취소
          </button>
        )}
      </div>
    </div>
  )
}
