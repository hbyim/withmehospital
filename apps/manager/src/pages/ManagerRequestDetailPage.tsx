import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatPrice } from '@mosimi/shared'
import { ServiceIcon } from '@mosimi/shared'
import { useBooking } from '@mosimi/shared'
import { useManager } from '@mosimi/shared'

export function ManagerRequestDetailPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { bookings, acceptBooking } = useBooking()
  const { manager, declineRequest, session } = useManager()
  const booking = bookings.find((b) => b.id === bookingId)
  const [error, setError] = useState('')

  if (!booking) {
    return (
      <div className="page">
        <p>요청을 찾을 수 없습니다.</p>
        <Link to="/requests">목록으로</Link>
      </div>
    )
  }

  const alreadyTaken =
    Boolean(booking.manager) || booking.status !== 'matching'

  function onAccept() {
    if (!session.online) {
      setError('수신 중지 상태에서는 수락할 수 없습니다.')
      return
    }
    const ok = acceptBooking(booking!.id, manager)
    if (!ok) {
      setError('이미 다른 매니저가 수락했거나 취소된 요청입니다.')
      return
    }
    navigate(`/jobs/${booking!.id}`, { replace: true })
  }

  function onDecline() {
    declineRequest(booking!.id)
    navigate('/requests')
  }

  return (
    <div className="page detail-page">
      <header className="sub-header">
        <button
          type="button"
          className="back"
          onClick={() => navigate('/requests')}
        >
          ←
        </button>
        <div>
          <p className="brand-inline manager-brand">모시미+ 매니저</p>
          <h1>요청 상세</h1>
        </div>
      </header>

      <div className="selected-service">
        <span className="row-icon">
          <ServiceIcon name={booking.service.icon} />
        </span>
        <div>
          <strong>{booking.service.name}</strong>
          <p>
            {booking.customerName ?? '고객'} · {booking.careTarget} 돌봄/동행
          </p>
        </div>
      </div>

      <section className="detail-block">
        <p>
          <strong>일정</strong> {booking.date} {booking.time} ·{' '}
          {booking.durationHours}시간
        </p>
        <p>
          <strong>만남</strong> {booking.pickup}
        </p>
        <p>
          <strong>목적지</strong> {booking.destination}
        </p>
        {booking.note && (
          <p>
            <strong>요청사항</strong> {booking.note}
          </p>
        )}
        <strong className="price">{formatPrice(booking.price)}</strong>
      </section>

      {alreadyTaken ? (
        <div className="empty soft">
          {booking.manager?.id === manager.id
            ? '이미 내가 수락한 요청입니다.'
            : `이미 ${booking.manager?.name ?? '다른 매니저'}님이 수락했습니다.`}
          <Link
            to={
              booking.manager?.id === manager.id
                ? `/jobs/${booking.id}`
                : '/requests'
            }
            className="btn primary"
            style={{ marginTop: 12 }}
          >
            {booking.manager?.id === manager.id ? '내 일정 보기' : '다른 요청 보기'}
          </Link>
        </div>
      ) : (
        <div className="action-stack">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn primary block" onClick={onAccept}>
            수락하고 배정받기
          </button>
          <button type="button" className="btn ghost block" onClick={onDecline}>
            거절하기
          </button>
        </div>
      )}
    </div>
  )
}
