import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBooking } from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

const tips = [
  '근처 매니저에게 요청을 전달했어요',
  '가능 매니저가 일정을 확인하고 있어요',
  '수락하는 순간 바로 배정됩니다',
]

export function MatchingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings, loading, getBooking } = useBooking()
  const [booking, setBooking] = useState(
    () => bookings.find((b) => b.id === bookingId) ?? null,
  )
  const [tipIndex, setTipIndex] = useState(0)
  const [waited, setWaited] = useState(0)

  useEffect(() => {
    const local = bookings.find((b) => b.id === bookingId)
    if (local) setBooking(local)
  }, [bookings, bookingId])

  useEffect(() => {
    if (!bookingId || booking) return
    let cancelled = false
    void getBooking(bookingId)
      .then((b) => {
        if (!cancelled) setBooking(b)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [bookingId, booking, getBooking])

  useEffect(() => {
    if (!booking) return
    if (booking.status === 'matched' || booking.manager) {
      navigate(`/detail/${booking.id}`, { replace: true })
    }
  }, [booking, navigate])

  useEffect(() => {
    const tipId = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length)
    }, 2200)
    const waitId = window.setInterval(() => {
      setWaited((s) => s + 1)
    }, 1000)
    return () => {
      clearInterval(tipId)
      clearInterval(waitId)
    }
  }, [])

  const mm = String(Math.floor(waited / 60)).padStart(2, '0')
  const ss = String(waited % 60).padStart(2, '0')

  if (loading && !booking) {
    return (
      <div className="page matching-page matching-page-v2">
        <div className="match-stage">
          <div className="radar radar-v2" aria-hidden>
            <span />
            <span />
            <span />
            <i className="pin" />
          </div>
          <p className="muted">불러오는 중…</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="page matching-page matching-page-v2">
        <p>예약을 찾을 수 없습니다.</p>
        <Link to="/" className="btn ghost">
          홈으로
        </Link>
      </div>
    )
  }

  return (
    <div className="page matching-page matching-page-v2">
      <div className="match-bg" aria-hidden>
        <div className="match-bg-orb a" />
        <div className="match-bg-orb b" />
      </div>

      <div className="match-stage">
        <p className="brand-inline match-brand animate-fade-up">모시미+</p>

        <div className="radar radar-v2 animate-fade-up delay-1" aria-hidden>
          <span />
          <span />
          <span />
          <span className="radar-sweep" />
          <i className="pin" />
          <i className="satellite s1" />
          <i className="satellite s2" />
          <i className="satellite s3" />
        </div>

        <h1 className="match-title animate-fade-up delay-1">
          매니저를
          <br />
          <em>찾고 있어요</em>
        </h1>
        <p className="match-sub animate-fade-up delay-2">
          <strong>{booking.pickup}</strong> 인근 매니저에게
          <br />
          요청을 보냈습니다
        </p>

        <div className="match-timer animate-fade-up delay-2" aria-live="polite">
          <span className="match-timer-label">대기 시간</span>
          <span className="match-timer-value">
            {mm}:{ss}
          </span>
        </div>

        <p className="match-tip match-tip-v2 animate-fade-up" key={tipIndex}>
          {tips[tipIndex]}
        </p>
      </div>

      <div className="match-panel animate-fade-up delay-3">
        <div className="match-summary">
          <p className="match-summary-label">신청 내용</p>
          <strong>{booking.service.name}</strong>
          <p>
            {booking.date} · {booking.time}
          </p>
          <p className="muted small">{booking.destination}</p>
        </div>

        <ol className="match-steps match-steps-v2">
          <li className="done">
            <span>1</span>
            <div>
              <strong>요청 접수</strong>
              <p>예약이 접수되었습니다</p>
            </div>
          </li>
          <li className="done active">
            <span>2</span>
            <div>
              <strong>매니저 앱으로 전달</strong>
              <p>수신 중인 매니저에게 알림</p>
            </div>
          </li>
          <li className={booking.manager ? 'done' : ''}>
            <span>3</span>
            <div>
              <strong>수락·배정</strong>
              <p>수락 즉시 연결됩니다</p>
            </div>
          </li>
        </ol>

        <div className="action-stack match-actions">
          <a href={MANAGER_APP_URL} className="btn primary block">
            매니저 앱 열기
          </a>
          <Link to={`/detail/${booking.id}`} className="btn ghost block">
            예약 상세 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
