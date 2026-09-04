import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiClientError,
  formatPrice,
  ServiceIcon,
  useBooking,
  useServices,
} from '@mosimi/shared'

export function BookingPage() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { draft, setDraft, createBooking, resetDraft } = useBooking()
  const { getById, loading: servicesLoading, error: servicesError } =
    useServices()
  const service = getById(serviceId ?? '')
  const appliedId = useRef<string | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!service || appliedId.current === service.id) return
    appliedId.current = service.id
    setDraft({
      service,
      durationHours: service.id === 'one-hour' ? 1 : 3,
      destination:
        service.category === 'care' ? '자택 / 돌봄 장소' : '서울아산병원',
    })
  }, [service, setDraft])

  const estimate = useMemo(() => {
    if (!service) return 0
    return service.basePrice + Math.max(0, draft.durationHours - 3) * 10000
  }, [service, draft.durationHours])

  if (servicesLoading && !service) {
    return (
      <div className="page">
        <p className="muted">서비스 불러오는 중…</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="page">
        <p>{servicesError || '서비스를 찾을 수 없습니다.'}</p>
        <Link to="/services">목록으로</Link>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const booking = await createBooking()
      if (!booking) return
      resetDraft()
      navigate(`/matching/${booking.id}`)
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : '예약 신청에 실패했습니다.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page booking-page">
      <header className="sub-header">
        <button type="button" className="back" onClick={() => navigate(-1)}>
          ←
        </button>
        <div>
          <p className="brand-inline">위드유</p>
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

      <form className="booking-form" onSubmit={(e) => void onSubmit(e)}>
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
          <p className="muted small">이용 후 결제 · 정기결제 없음</p>
        </div>

        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn primary block" disabled={pending}>
          {pending ? '신청 중…' : '매니저 매칭 시작'}
        </button>
      </form>
    </div>
  )
}
