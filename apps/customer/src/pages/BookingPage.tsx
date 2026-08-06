import { useEffect, useMemo, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatPrice, getServiceById } from '@mosimi/shared'
import { useBooking } from '@mosimi/shared'
import { ServiceIcon } from '@mosimi/shared'

export function BookingPage() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { draft, setDraft, createBooking, resetDraft } = useBooking()
  const service = getServiceById(serviceId ?? '')

  useEffect(() => {
    if (service) {
      setDraft({
        service,
        durationHours: service.id === 'one-hour' ? 1 : 3,
        destination:
          service.category === 'care'
            ? '자택 / 돌봄 장소'
            : '서울아산병원',
      })
    }
  }, [service, setDraft])

  const estimate = useMemo(() => {
    if (!service) return 0
    return service.basePrice + Math.max(0, draft.durationHours - 3) * 10000
  }, [service, draft.durationHours])

  if (!service) {
    return (
      <div className="page">
        <p>서비스를 찾을 수 없습니다.</p>
        <Link to="/services">목록으로</Link>
      </div>
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const booking = createBooking()
    if (!booking) return
    resetDraft()
    navigate(`/matching/${booking.id}`)
  }

  return (
    <div className="page booking-page">
      <header className="sub-header">
        <button type="button" className="back" onClick={() => navigate(-1)}>
          ←
        </button>
        <div>
          <p className="brand-inline">모시미+</p>
          <h1>예약 신청</h1>
        </div>
      </header>

      <div className="selected-service">
        <span className="row-icon">
          <ServiceIcon name={service.icon} />
        </span>
        <div>
          <strong>{service.name}</strong>
          <p>{service.description}</p>
        </div>
      </div>

      <form className="booking-form" onSubmit={onSubmit}>
        <label>
          이용 대상
          <input
            value={draft.careTarget}
            onChange={(e) => setDraft({ careTarget: e.target.value })}
            placeholder="예: 어머니, 본인"
            required
          />
        </label>

        <label>
          만남 장소
          <input
            value={draft.pickup}
            onChange={(e) => setDraft({ pickup: e.target.value })}
            required
          />
        </label>

        <label>
          {service.category === 'companion' ? '목적지(병원 등)' : '돌봄 장소'}
          <input
            value={draft.destination}
            onChange={(e) => setDraft({ destination: e.target.value })}
            required
          />
        </label>

        <div className="form-row">
          <label>
            날짜
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ date: e.target.value })}
              required
            />
          </label>
          <label>
            시간
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraft({ time: e.target.value })}
              required
            />
          </label>
        </div>

        <label>
          예상 이용 시간 ({draft.durationHours}시간)
          <input
            type="range"
            min={1}
            max={8}
            value={draft.durationHours}
            onChange={(e) =>
              setDraft({ durationHours: Number(e.target.value) })
            }
          />
        </label>

        <label>
          요청 사항
          <textarea
            rows={3}
            value={draft.note}
            onChange={(e) => setDraft({ note: e.target.value })}
            placeholder="휠체어, 약 복용, 특이사항 등"
          />
        </label>

        <div className="price-box">
          <div>
            <p>예상 요금</p>
            <strong>{formatPrice(estimate)}</strong>
          </div>
          <p className="muted small">데모용 견적 · 이용 후 결제 (정기결제 없음)</p>
        </div>

        <button type="submit" className="btn primary block">
          매니저 매칭 시작
        </button>
      </form>
    </div>
  )
}
