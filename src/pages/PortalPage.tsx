import { Link } from 'react-router-dom'

export function PortalPage() {
  return (
    <div className="portal-page">
      <div className="portal-card">
        <p className="brand-mark">모시미+</p>
        <h1>데모 앱 선택</h1>
        <p className="muted">
          고객 앱에서 서비스를 신청하면, 매니저 앱에서 요청을 수락해
          배정받을 수 있습니다. 두 탭을 열어 실시간 연동을 확인해 보세요.
        </p>

        <div className="portal-actions">
          <Link to="/app" className="portal-tile customer">
            <span className="portal-badge">고객용</span>
            <strong>모시미+</strong>
            <p>병원 동행·돌봄 서비스 신청</p>
          </Link>
          <Link to="/manager" className="portal-tile manager">
            <span className="portal-badge">매니저용</span>
            <strong>모시미+ 매니저</strong>
            <p>서비스 요청 수락·배정·수행</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
