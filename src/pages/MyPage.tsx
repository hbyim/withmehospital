import { Link } from 'react-router-dom'
import { useBooking } from '../store/BookingContext'

export function MyPage() {
  const { bookings } = useBooking()
  const completed = bookings.filter((b) => b.status === 'completed').length
  const active = bookings.filter((b) =>
    ['matched', 'confirmed', 'in_progress', 'matching'].includes(b.status),
  ).length

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline">모시미+</p>
        <h1>마이페이지</h1>
      </header>

      <section className="profile-block">
        <div className="avatar large">김</div>
        <div>
          <h2>김모시 님</h2>
          <p className="muted">데모 계정 · 010-1234-5678</p>
        </div>
      </section>

      <section className="stat-row">
        <div>
          <strong>{active}</strong>
          <span>진행/예약</span>
        </div>
        <div>
          <strong>{completed}</strong>
          <span>이용 완료</span>
        </div>
        <div>
          <strong>{bookings.length}</strong>
          <span>전체</span>
        </div>
      </section>

      <ul className="menu-list">
        <li>
          <Link to="/history">이용 내역</Link>
        </li>
        <li>
          <Link to="/services">새 서비스 신청</Link>
        </li>
        <li>
          <Link to="/chat">고객 상담</Link>
        </li>
        <li>
          <a href="https://www.mosimi.co.kr" target="_blank" rel="noreferrer">
            공식 홈페이지 (참고)
          </a>
        </li>
      </ul>

      <p className="demo-note">
        이 앱은 모시미(병원동행·돌봄 매칭)의 핵심 기능을 재현한 데모입니다.
        실제 결제·본인인증·매니저 배정은 동작하지 않습니다.
      </p>
    </div>
  )
}
