import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBooking } from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

const tips = [
  '근처 매니저 앱으로 요청을 전달했습니다',
  '가능 매니저가 일정을 확인하고 있습니다',
  '수락하는 매니저가 배정됩니다',
]

export function MatchingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings } = useBooking()
  const booking = bookings.find((b) => b.id === bookingId)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (!booking) return
    if (booking.status === 'matched' || booking.manager) {
      navigate(`/detail/${booking.id}`, { replace: true })
    }
  }, [booking, navigate])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  if (!booking) {
    return (
      <div className="page">
        <p>예약을 찾을 수 없습니다.</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  return (
    <div className="page matching-page">
      <div className="radar" aria-hidden>
        <span />
        <span />
        <span />
        <i className="pin" />
      </div>
      <p className="brand-inline center">모시미+</p>
      <h1>매니저 수락 대기 중</h1>
      <p className="muted center">
        {booking.pickup} 인근 매니저에게 요청을 보냈습니다.
        <br />
        매니저 앱에서 수락하면 바로 배정됩니다.
      </p>

      <p className="match-tip animate-fade-up" key={tipIndex}>
        {tips[tipIndex]}
      </p>

      <ol className="match-steps">
        <li className="done">
          <span>1</span>요청 접수
        </li>
        <li className="done">
          <span>2</span>매니저 앱으로 전달
        </li>
        <li className={booking.manager ? 'done' : ''}>
          <span>3</span>매니저 수락·배정
        </li>
      </ol>

      <div className="action-stack" style={{ marginTop: 20, width: '100%' }}>
        <a href={MANAGER_APP_URL} className="btn primary block">
          매니저 앱 열기
        </a>
        <Link to={`/detail/${booking.id}`} className="btn ghost block">
          예약 상세 보기
        </Link>
      </div>
    </div>
  )
}
