import { Link, useSearchParams } from 'react-router-dom'
import {
  formatPrice,
  ServiceIcon,
  useServices,
  type ServiceCategory,
} from '@mosimi/shared'

export function ServicesPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as ServiceCategory) || 'companion'
  const { companionServices, careServices, loading, error } = useServices()
  const list = tab === 'care' ? careServices : companionServices

  return (
    <div className="page">
      <header className="page-header">
        <p className="brand-inline">모시미+</p>
        <h1>서비스 선택</h1>
        <p className="muted">필요한 동행·돌봄을 고르고 바로 예약하세요.</p>
      </header>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={tab === 'companion' ? 'active' : ''}
          onClick={() => setParams({ tab: 'companion' })}
        >
          동행
        </button>
        <button
          type="button"
          className={tab === 'care' ? 'active' : ''}
          onClick={() => setParams({ tab: 'care' })}
        >
          돌봄
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && list.length === 0 ? (
        <p className="muted">서비스 불러오는 중…</p>
      ) : (
        <ul className="service-list">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/booking/${s.id}`} className="service-row">
                <span className="row-icon">
                  <ServiceIcon name={s.icon} size={24} />
                </span>
                <div>
                  <strong>{s.name}</strong>
                  <p>{s.description}</p>
                  <span className="meta">
                    {s.durationHint} · {formatPrice(s.basePrice)} / {s.unit}
                  </span>
                </div>
                <span className="chevron" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
