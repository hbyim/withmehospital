import { Link } from 'react-router-dom'
import { companionServices, careServices, formatPrice } from '../data/services'
import { ServiceIcon } from '../components/ServiceIcon'
import { useBooking } from '../store/BookingContext'

export function HomePage() {
  const { bookings } = useBooking()
  const upcoming = bookings.find(
    (b) => b.status === 'confirmed' || b.status === 'matched',
  )

  return (
    <div className="page home-page">
      <header className="home-hero">
        <div className="hero-atmosphere" aria-hidden />
        <p className="brand-mark animate-fade-up">모시미+</p>
        <h1 className="hero-title animate-fade-up delay-1">
          바쁜 나를 대신해
          <br />
          가족을 모셔드립니다
        </h1>
        <p className="hero-sub animate-fade-up delay-2">
          AI·위치 기반 실시간 매칭으로 병원 동행과 돌봄 매니저를 연결합니다.
        </p>
        <div className="hero-cta animate-fade-up delay-3">
          <Link to="/app/services" className="btn primary">
            서비스 신청하기
          </Link>
          <Link to="/app/chat" className="btn ghost">
            챗봇 상담
          </Link>
        </div>
      </header>

      {upcoming && (
        <section className="section upcoming-banner animate-fade-up delay-3">
          <div>
            <p className="eyebrow">다가오는 일정</p>
            <h2>
              {upcoming.date} {upcoming.time} · {upcoming.service.name}
            </h2>
            <p>
              {upcoming.manager?.name ?? '매니저 배정 중'} ·{' '}
              {upcoming.destination}
            </p>
          </div>
          <Link to={`/app/detail/${upcoming.id}`} className="text-link">
            상세
          </Link>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>동행 서비스</h2>
          <Link to="/app/services?tab=companion">전체</Link>
        </div>
        <div className="service-rail">
          {companionServices.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              to={`/app/booking/${s.id}`}
              className="service-chip"
            >
              <span className="chip-icon">
                <ServiceIcon name={s.icon} />
              </span>
              <strong>{s.name}</strong>
              <span>{formatPrice(s.basePrice)}~</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>돌봄 서비스</h2>
          <Link to="/app/services?tab=care">전체</Link>
        </div>
        <div className="service-rail">
          {careServices.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              to={`/app/booking/${s.id}`}
              className="service-chip care"
            >
              <span className="chip-icon">
                <ServiceIcon name={s.icon} />
              </span>
              <strong>{s.name}</strong>
              <span>{formatPrice(s.basePrice)}~</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section trust-row">
        <article>
          <strong>연령 무관</strong>
          <p>본인·가족 누구나</p>
        </article>
        <article>
          <strong>원하는 시간</strong>
          <p>장소·일정 맞춤</p>
        </article>
        <article>
          <strong>이용 후 결제</strong>
          <p>정기결제 없음</p>
        </article>
      </section>
    </div>
  )
}
