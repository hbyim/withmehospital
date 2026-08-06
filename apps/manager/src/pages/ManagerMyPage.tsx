import { Link } from 'react-router-dom'
import {
  BOOKINGS_STORAGE_KEY,
  managers,
  useBooking,
  useManager,
} from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerMyPage() {
  const { manager, session, setOnline, switchManager } = useManager()
  const { bookings } = useBooking()

  const mine = bookings.filter((b) => b.manager?.id === manager.id)
  const completed = mine.filter((b) => b.status === 'completed')
  const active = mine.filter((b) =>
    ['matched', 'confirmed', 'in_progress'].includes(b.status),
  )

  function resetDemoData() {
    localStorage.removeItem(BOOKINGS_STORAGE_KEY)
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline manager-brand">모시미+ 매니저</p>
        <h1>마이페이지</h1>
      </header>

      <section className="profile-block">
        <div className="avatar large" style={{ background: manager.color }}>
          {manager.name.slice(0, 1)}
        </div>
        <div>
          <h2>{manager.name} 매니저</h2>
          <p className="muted">
            ★ {manager.rating} · 경력 {manager.experienceYears}년
          </p>
        </div>
      </section>

      <section className="stat-row">
        <div>
          <strong>{active.length}</strong>
          <span>진행/예정</span>
        </div>
        <div>
          <strong>{completed.length}</strong>
          <span>완료</span>
        </div>
        <div>
          <strong>{session.online ? 'ON' : 'OFF'}</strong>
          <span>수신</span>
        </div>
      </section>

      <div className="tags" style={{ marginBottom: 16 }}>
        {manager.specialties.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>

      <label className="switch-row">
        <span>새 요청 수신</span>
        <button
          type="button"
          className={`online-toggle ${session.online ? 'on' : 'off'}`}
          onClick={() => setOnline(!session.online)}
        >
          <i />
          {session.online ? 'ON' : 'OFF'}
        </button>
      </label>

      <section className="section">
        <div className="section-head">
          <h2>데모 계정 전환</h2>
        </div>
        <div className="manager-switch">
          {managers.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === manager.id ? 'active' : ''}
              onClick={() => switchManager(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
      </section>

      <ul className="menu-list">
        <li>
          <Link to="/requests">서비스 요청</Link>
        </li>
        <li>
          <Link to="/jobs">내 일정</Link>
        </li>
        <li>
          <a href={CUSTOMER_APP_URL}>고객 앱 열기</a>
        </li>
        <li>
          <button type="button" className="linkish" onClick={resetDemoData}>
            데모 데이터 초기화
          </button>
        </li>
      </ul>

      <p className="demo-note">
        매니저 앱은 고객 신청을 수락해 담당자로 배정받는 흐름을 데모합니다.
        같은 브라우저에서 고객 앱과 데이터가 공유됩니다.
      </p>
    </div>
  )
}
