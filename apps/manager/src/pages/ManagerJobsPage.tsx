import { Link } from 'react-router-dom'
import {
  bookingStatusLabel,
  formatPrice,
  paymentStatusLabel,
  useBooking,
  useManager,
  type BookingStatus,
} from '@mosimi/shared'

export function ManagerJobsPage() {
  const { bookings, loading, error } = useBooking()
  const { manager } = useManager()
  const myJobs = bookings.filter((b) => b.manager?.id === manager.id)

  const active = myJobs.filter((b) =>
    ['matched', 'confirmed', 'in_progress'].includes(b.status),
  )
  const done = myJobs.filter((b) =>
    ['completed', 'cancelled'].includes(b.status),
  )

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline manager-brand">모시미+ 매니저</p>
        <h1>내 일정</h1>
        <p className="muted">수락·배정된 서비스 일정을 관리합니다.</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      {loading && myJobs.length === 0 ? (
        <p className="muted">불러오는 중…</p>
      ) : myJobs.length === 0 ? (
        <div className="empty">
          <p>아직 배정된 일정이 없습니다.</p>
          <Link to="/requests" className="btn primary">
            요청 보러가기
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>진행·예정</h2>
              </div>
              <ul className="history-list">
                {active.map((b) => (
                  <li key={b.id}>
                    <Link to={`/jobs/${b.id}`} className="history-row">
                      <div>
                        <div className="row-top">
                          <strong>{b.service.name}</strong>
                          <span className={`badge ${b.status}`}>
                            {bookingStatusLabel[b.status as BookingStatus]}
                          </span>
                        </div>
                        <p>
                          {b.date} {b.time} · {b.destination}
                        </p>
                        <p className="muted">
                          {formatPrice(b.price)} ·{' '}
                          {paymentStatusLabel[b.paymentStatus ?? 'unpaid']}
                        </p>
                      </div>
                      <span className="chevron">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>완료·취소</h2>
              </div>
              <ul className="history-list">
                {done.map((b) => (
                  <li key={b.id}>
                    <Link to={`/jobs/${b.id}`} className="history-row">
                      <div>
                        <div className="row-top">
                          <strong>{b.service.name}</strong>
                          <span className={`badge ${b.status}`}>
                            {bookingStatusLabel[b.status as BookingStatus]}
                          </span>
                        </div>
                        <p>
                          {b.date} {b.time} ·{' '}
                          {paymentStatusLabel[b.paymentStatus ?? 'unpaid']}
                        </p>
                      </div>
                      <span className="chevron">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
