import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  disableWebPush,
  enableWebPush,
  useAuth,
  useBooking,
  useManager,
} from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerMyPage() {
  const { logout } = useAuth()
  const { manager, session, setOnline, updateProfile } = useManager()
  const { bookings } = useBooking()
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [pushOn, setPushOn] = useState(false)
  const [bio, setBio] = useState(manager.bio)
  const [region, setRegion] = useState(manager.region ?? '')
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setBio(manager.bio)
    setRegion(manager.region ?? '')
  }, [manager.bio, manager.region])

  const mine = bookings.filter((b) => b.manager?.id === manager.id)
  const completed = mine.filter((b) => b.status === 'completed')
  const active = mine.filter((b) =>
    ['matched', 'confirmed', 'in_progress'].includes(b.status),
  )

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

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg(null)
    try {
      await updateProfile({ bio, region })
      setProfileMsg('프로필이 저장되었습니다.')
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline manager-brand">위드유 매니저</p>
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

      <form className="booking-form" onSubmit={(e) => void onSaveProfile(e)}>
        <label>
          소개
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <label>
          활동 지역
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="예: 서울 강남"
          />
        </label>
        {profileMsg && <p className="demo-note">{profileMsg}</p>}
        <button type="submit" className="btn ghost block" disabled={saving}>
          {saving ? '저장 중…' : '프로필 저장'}
        </button>
      </form>

      <ul className="menu-list">
        <li>
          <Link to="/requests">서비스 요청</Link>
        </li>
        <li>
          <Link to="/jobs">내 일정</Link>
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
