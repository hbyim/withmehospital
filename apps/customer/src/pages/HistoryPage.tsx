import { Link } from 'react-router-dom'
import {
  bookingStatusLabel,
  formatPrice,
  paymentStatusLabel,
  useBooking,
} from '@mosimi/shared'

export function HistoryPage() {
  const { bookings, loading, error } = useBooking()

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline">모시미+</p>
        <h1>이용 내역</h1>
        <p className="muted">신청·매칭·진행·결제 상태를 한곳에서 확인하세요.</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && bookings.length === 0 ? (
        <p className="muted">불러오는 중…</p>
      ) : bookings.length === 0 ? (
        <div className="empty">
          <p>아직 예약이 없습니다.</p>
          <Link to="/services" className="btn primary">
            첫 서비스 신청
          </Link>
        </div>
      ) : (
        <ul className="history-list">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link to={`/detail/${b.id}`} className="history-row">
                <div>
                  <div className="row-top">
                    <strong>{b.service.name}</strong>
                    <span className={`badge ${b.status}`}>
                      {bookingStatusLabel[b.status]}
                    </span>
                  </div>
                  <p>
                    {b.date} {b.time} · {b.careTarget}
                  </p>
                  <p className="muted">
                    {b.manager ? `${b.manager.name} 매니저` : '매니저 배정 대기'}{' '}
                    · {formatPrice(b.price)} ·{' '}
                    <span className={`badge pay-${b.paymentStatus ?? 'unpaid'}`}>
                      {paymentStatusLabel[b.paymentStatus ?? 'unpaid']}
                    </span>
                  </p>
                </div>
                <span className="chevron">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
