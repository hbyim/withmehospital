import { Link } from 'react-router-dom'
import { useBooking } from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

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
          <a href={MANAGER_APP_URL}>매니저 앱 열기</a>
        </li>
      </ul>

      <p className="demo-note">
        고객용 모시미+ 데모입니다. 매니저 배정은 별도 매니저 앱에서 수락하면
        반영됩니다.
      </p>
    </div>
  )
}
