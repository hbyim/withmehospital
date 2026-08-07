import { Link } from 'react-router-dom'
import { formatPrice, paymentStatusLabel, useBooking, useManager } from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerHomePage() {
  const { bookings, openRequests, error } = useBooking()
  const { manager, session, setOnline } = useManager()

  const myJobs = bookings.filter(
    (b) =>
      b.manager?.id === manager.id &&
      ['matched', 'confirmed', 'in_progress'].includes(b.status),
  )
  const today = new Date().toISOString().slice(0, 10)
  const todayJobs = myJobs.filter((b) => b.date === today)
  const paidCompleted = bookings.filter(
    (b) =>
      b.manager?.id === manager.id &&
      b.status === 'completed' &&
      b.paymentStatus === 'paid',
  )
  const earned = paidCompleted.reduce((sum, b) => sum + b.price, 0)
  const visibleOpen = session.online ? openRequests : []

  return (
    <div className="page manager-home">
      <header className="manager-hero">
        <div className="manager-hero-top">
          <div>
            <p className="brand-inline manager-brand">모시미+ 매니저</p>
            <h1>{manager.name} 매니저님</h1>
          </div>
          <button
            type="button"
            className={`online-toggle ${session.online ? 'on' : 'off'}`}
            onClick={() => void setOnline(!session.online)}
            aria-pressed={session.online}
          >
            <i />
            {session.online ? '수신 중' : '수신 중지'}
          </button>
        </div>
        <p className="muted">
          {session.online
            ? '새 서비스 신청을 받아 수락할 수 있습니다.'
            : '수신 중지 상태에서는 새 요청이 표시되지 않습니다.'}
        </p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="stat-row manager-stats">
        <div>
          <strong>{visibleOpen.length}</strong>
          <span>대기 요청</span>
        </div>
        <div>
          <strong>{todayJobs.length}</strong>
          <span>오늘 일정</span>
        </div>
        <div>
          <strong>{(earned / 10000).toFixed(1)}만</strong>
          <span>결제완료 수익</span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>새 요청</h2>
          <Link to="/requests">전체</Link>
        </div>
        {!session.online ? (
          <div className="empty soft">
            <p>수신이 꺼져 있습니다.</p>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={() => void setOnline(true)}
            >
              수신 켜기
            </button>
          </div>
        ) : visibleOpen.length === 0 ? (
          <div className="empty soft">현재 수락 가능한 요청이 없습니다.</div>
        ) : (
          <ul className="history-list">
            {visibleOpen.slice(0, 3).map((b) => (
              <li key={b.id}>
                <Link to={`/requests/${b.id}`} className="history-row call-row">
                  <div>
                    <div className="row-top">
                      <strong>{b.service.name}</strong>
                      <span className="badge matching">수락 대기</span>
                    </div>
                    <p>
                      {b.date} {b.time} · {b.pickup}
                    </p>
                    <p className="muted">
                      {b.customerName ?? '고객'} · {formatPrice(b.price)}
                    </p>
                  </div>
                  <span className="chevron">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>내 배정 일정</h2>
          <Link to="/jobs">전체</Link>
        </div>
        {myJobs.length === 0 ? (
          <div className="empty soft">배정된 일정이 없습니다. 요청을 수락해 보세요.</div>
        ) : (
          <ul className="history-list">
            {myJobs.slice(0, 3).map((b) => (
              <li key={b.id}>
                <Link to={`/jobs/${b.id}`} className="history-row">
                  <div>
                    <div className="row-top">
                      <strong>{b.service.name}</strong>
                      <span className={`badge ${b.status}`}>
                        {b.status === 'matched'
                          ? '배정됨'
                          : b.status === 'confirmed'
                            ? '확정'
                            : '진행 중'}
                      </span>
                    </div>
                    <p>
                      {b.date} {b.time} · {b.destination}
                    </p>
                    {b.paymentStatus && (
                      <p className="muted small">
                        {paymentStatusLabel[b.paymentStatus]}
                      </p>
                    )}
                  </div>
                  <span className="chevron">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a href={CUSTOMER_APP_URL} className="text-link center-link">
        고객 앱 열기 →
      </a>
    </div>
  )
}
