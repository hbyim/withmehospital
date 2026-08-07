import { useState } from 'react'
import { Link } from 'react-router-dom'
import { enableWebPush, useAuth, useBooking, useManager } from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerMyPage() {
  const { logout } = useAuth()
  const { manager, session, setOnline } = useManager()
  const { bookings } = useBooking()
  const [pushMsg, setPushMsg] = useState<string | null>(null)

  const mine = bookings.filter((b) => b.manager?.id === manager.id)
  const completed = mine.filter((b) => b.status === 'completed')
  const active = mine.filter((b) =>
    ['matched', 'confirmed', 'in_progress'].includes(b.status),
  )

  const onEnablePush = async () => {
    setPushMsg(null)
    try {
      await enableWebPush()
      setPushMsg('푸시 알림이 활성화되었습니다.')
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : '푸시 활성화 실패')
    }
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
          onClick={() => void setOnline(!session.online)}
        >
          <i />
          {session.online ? 'ON' : 'OFF'}
        </button>
      </label>

      <ul className="menu-list">
        <li>
          <Link to="/requests">서비스 요청</Link>
        </li>
        <li>
          <Link to="/jobs">내 일정</Link>
        </li>
        <li>
          <button type="button" className="linkish" onClick={() => void onEnablePush()}>
            푸시 알림 켜기
          </button>
        </li>
        <li>
          <a href={CUSTOMER_APP_URL}>고객 앱 열기</a>
        </li>
        <li>
          <button type="button" className="linkish" onClick={logout}>
            로그아웃
          </button>
        </li>
      </ul>

      {pushMsg && <p className="demo-note">{pushMsg}</p>}

      <p className="demo-note">
        매니저 앱 — 요청 수락/거절·일정·푸시가 백엔드 API와 연동됩니다.
      </p>
    </div>
  )
}
