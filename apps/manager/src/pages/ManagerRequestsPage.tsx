import { Link } from 'react-router-dom'
import { formatPrice, useBooking, useManager } from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerRequestsPage() {
  const { openRequests, loading, error } = useBooking()
  const { session, setOnline } = useManager()
  const list = session.online ? openRequests : []

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline manager-brand">모시미+ 매니저</p>
        <h1>서비스 요청</h1>
        <p className="muted">
          고객이 신청한 동행·돌봄 요청입니다. 수락하면 담당 매니저로 배정됩니다.
        </p>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!session.online ? (
        <div className="empty">
          <p>수신 중지 상태입니다. 수신을 켜 주세요.</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => void setOnline(true)}
          >
            수신 켜기
          </button>
        </div>
      ) : loading && list.length === 0 ? (
        <p className="muted">불러오는 중…</p>
      ) : list.length === 0 ? (
        <div className="empty">
          <p>대기 중인 요청이 없습니다.</p>
          <a href={CUSTOMER_APP_URL} className="btn primary">
            고객 앱에서 신청해보기
          </a>
        </div>
      ) : (
        <ul className="history-list">
          {list.map((b) => (
            <li key={b.id}>
              <Link to={`/requests/${b.id}`} className="history-row call-row">
                <div>
                  <div className="row-top">
                    <strong>{b.service.name}</strong>
                    <span className="badge matching">NEW</span>
                  </div>
                  <p>
                    {b.date} {b.time} · {b.durationHours}시간
                  </p>
                  <p className="muted">
                    {b.pickup} → {b.destination}
                  </p>
                  <p className="meta-earn">{formatPrice(b.price)}</p>
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
