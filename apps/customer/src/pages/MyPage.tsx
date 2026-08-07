import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  disableWebPush,
  enableWebPush,
  useAuth,
  useBooking,
} from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

export function MyPage() {
  const { user, logout } = useAuth()
  const { bookings } = useBooking()
  const completed = bookings.filter((b) => b.status === 'completed').length
  const active = bookings.filter((b) =>
    ['matched', 'confirmed', 'in_progress', 'matching'].includes(b.status),
  ).length
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [pushOn, setPushOn] = useState(false)

  const onEnablePush = async () => {
    setPushMsg(null)
    try {
      await enableWebPush()
      setPushOn(true)
      setPushMsg('푸시 알림이 활성화되었습니다.')
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : '푸시 활성화 실패')
    }
  }

  const onDisablePush = async () => {
    setPushMsg(null)
    try {
      await disableWebPush()
      setPushOn(false)
      setPushMsg('푸시 알림을 껐습니다.')
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : '푸시 해제 실패')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline">모시미+</p>
        <h1>마이페이지</h1>
      </header>

      <section className="profile-block">
        <div className="avatar large">{user?.name?.slice(0, 1) ?? '고'}</div>
        <div>
          <h2>{user?.name ?? '고객'} 님</h2>
          <p className="muted">{user?.email}</p>
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
          <button
            type="button"
            className="linkish"
            onClick={() => void (pushOn ? onDisablePush() : onEnablePush())}
          >
            {pushOn ? '푸시 알림 끄기' : '푸시 알림 켜기'}
          </button>
        </li>
        <li>
          <a href={MANAGER_APP_URL}>매니저 앱 열기</a>
        </li>
        <li>
          <button type="button" className="linkish" onClick={logout}>
            로그아웃
          </button>
        </li>
      </ul>

      {pushMsg && <p className="demo-note">{pushMsg}</p>}

      <p className="demo-note">
        고객용 모시미+ — 예약·매칭·결제·푸시는 백엔드 API와 연동됩니다.
      </p>
    </div>
  )
}
