import { Link } from 'react-router-dom'
import { formatPrice } from '../data/services'
import { useBooking, type BookingStatus } from '../store/BookingContext'

const label: Record<BookingStatus, string> = {
  draft: '작성 중',
  matching: '매칭 중',
  matched: '배정됨',
  confirmed: '확정',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소',
}

export function HistoryPage() {
  const { bookings } = useBooking()

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline">모시미+</p>
        <h1>이용 내역</h1>
        <p className="muted">신청·매칭·진행 상태를 한곳에서 확인하세요.</p>
      </header>

      {bookings.length === 0 ? (
        <div className="empty">
          <p>아직 예약이 없습니다.</p>
          <Link to="/app/services" className="btn primary">
            첫 서비스 신청
          </Link>
        </div>
      ) : (
        <ul className="history-list">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link to={`/app/detail/${b.id}`} className="history-row">
                <div>
                  <div className="row-top">
                    <strong>{b.service.name}</strong>
                    <span className={`badge ${b.status}`}>
                      {label[b.status]}
                    </span>
                  </div>
                  <p>
                    {b.date} {b.time} · {b.careTarget}
                  </p>
                  <p className="muted">
                    {b.manager ? `${b.manager.name} 매니저` : '매니저 배정 대기'}{' '}
                    · {formatPrice(b.price)}
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
