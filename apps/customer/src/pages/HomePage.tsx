import { Link } from 'react-router-dom'
import {
  formatPrice,
  paymentStatusLabel,
  ServiceIcon,
  useBooking,
  useServices,
} from '@mosimi/shared'

export function HomePage() {
  const { bookings, error } = useBooking()
  const { companionServices, careServices, loading } = useServices()
  const upcoming = bookings.find((b) =>
    ['confirmed', 'matched', 'in_progress'].includes(b.status),
  )

  return (
    <div className="page home-page">
      <header className="home-hero home-hero-v2">
        <div className="hero-atmosphere" aria-hidden />
        <div className="hero-orb hero-orb-a" aria-hidden />
        <div className="hero-orb hero-orb-b" aria-hidden />
        <div className="hero-content">
          <p className="brand-mark animate-fade-up">모시미+</p>
          <h1 className="hero-title animate-fade-up delay-1">
            바쁜 나를 대신해
            <br />
            <em>가족을 모셔드립니다</em>
          </h1>
          <p className="hero-sub animate-fade-up delay-2">
            실시간 매칭으로 병원 동행과 돌봄 매니저를 연결합니다.
          </p>
          <div className="hero-cta animate-fade-up delay-3">
            <Link to="/services" className="btn primary hero-btn">
              서비스 신청하기
              <span className="btn-arrow" aria-hidden>
                →
              </span>
            </Link>
            <Link to="/chat" className="btn ghost hero-btn">
              챗봇 상담
            </Link>
          </div>
          <ul className="hero-pills animate-fade-up delay-3" aria-label="서비스 특징">
            <li>본인인증 매니저</li>
            <li>원하는 일정</li>
            <li>이용 후 결제</li>
          </ul>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {upcoming && (
        <section className="upcoming-card animate-fade-up delay-3">
          <div className="upcoming-glow" aria-hidden />
          <div className="upcoming-body">
            <div className="upcoming-top">
              <span className="upcoming-badge">다가오는 일정</span>
              <span className="upcoming-status">
                {upcoming.status === 'in_progress'
                  ? '진행 중'
                  : upcoming.status === 'confirmed'
                    ? '확정'
                    : '배정됨'}
              </span>
            </div>
            <h2 className="upcoming-title">
              {upcoming.service.name}
            </h2>
            <p className="upcoming-meta">
              <span>
                {upcoming.date} · {upcoming.time}
              </span>
              <span>
                {upcoming.manager?.name ?? '매니저 배정 중'}
              </span>
            </p>
            <p className="upcoming-dest">{upcoming.destination}</p>
            {upcoming.paymentStatus && upcoming.paymentStatus !== 'paid' ? (
              <p className="upcoming-pay">
                {paymentStatusLabel[upcoming.paymentStatus]}
              </p>
            ) : null}
          </div>
          <Link to={`/detail/${upcoming.id}`} className="upcoming-cta">
            상세 보기
          </Link>
        </section>
      )}

      <section className="section section-spotlight">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">Companion</p>
            <h2>동행 서비스</h2>
          </div>
          <Link to="/services?tab=companion">전체</Link>
        </div>
        {loading && companionServices.length === 0 ? (
          <div className="skeleton-rail" aria-hidden>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : (
          <div className="service-rail service-rail-v2">
            {companionServices.slice(0, 4).map((s, i) => (
              <Link
                key={s.id}
                to={`/booking/${s.id}`}
                className={`service-card animate-fade-up delay-${Math.min(i + 1, 3)}`}
              >
                <span className="service-card-glow" aria-hidden />
                <span className="chip-icon service-card-icon">
                  <ServiceIcon name={s.icon} />
                </span>
                <strong>{s.name}</strong>
                <span className="service-card-hint">{s.durationHint}</span>
                <span className="service-card-price">
                  {formatPrice(s.basePrice)}~
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section section-spotlight">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">Care</p>
            <h2>돌봄 서비스</h2>
          </div>
          <Link to="/services?tab=care">전체</Link>
        </div>
        <div className="service-rail service-rail-v2">
          {careServices.slice(0, 4).map((s, i) => (
            <Link
              key={s.id}
              to={`/booking/${s.id}`}
              className={`service-card care animate-fade-up delay-${Math.min(i + 1, 3)}`}
            >
              <span className="service-card-glow" aria-hidden />
              <span className="chip-icon service-card-icon care">
                <ServiceIcon name={s.icon} />
              </span>
              <strong>{s.name}</strong>
              <span className="service-card-hint">{s.durationHint}</span>
              <span className="service-card-price">
                {formatPrice(s.basePrice)}~
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="trust-row trust-row-v2">
        <article>
          <span className="trust-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
            </svg>
          </span>
          <strong>연령 무관</strong>
          <p>본인·가족 누구나</p>
        </article>
        <article>
          <span className="trust-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v5l3 2" />
            </svg>
          </span>
          <strong>원하는 시간</strong>
          <p>장소·일정 맞춤</p>
        </article>
        <article>
          <span className="trust-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <strong>이용 후 결제</strong>
          <p>정기결제 없음</p>
        </article>
      </section>
    </div>
  )
}
