import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBooking } from '../store/BookingContext'

const steps = [
  '요청 접수',
  '위치 기반 탐색',
  '가능 매니저 필터링',
  '최적 매칭 완료',
]

export function MatchingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings, matchManager } = useBooking()
  const booking = bookings.find((b) => b.id === bookingId)
  const [step, setStep] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!booking || !bookingId) return
    if (booking.status === 'matched' || booking.manager) {
      navigate(`/detail/${booking.id}`, { replace: true })
      return
    }
    if (started.current) return
    started.current = true

    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1100),
      setTimeout(() => setStep(3), 1700),
    ]

    matchManager(bookingId).then(() => {
      navigate(`/detail/${bookingId}`, { replace: true })
    })

    return () => timers.forEach(clearTimeout)
  }, [booking, bookingId, matchManager, navigate])

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
      <h1>근처 매니저를 찾는 중</h1>
      <p className="muted center">
        AI·빅데이터·위치정보로 {booking.pickup} 인근 매니저를 매칭합니다.
      </p>

      <ol className="match-steps">
        {steps.map((label, i) => (
          <li key={label} className={i <= step ? 'done' : ''}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
