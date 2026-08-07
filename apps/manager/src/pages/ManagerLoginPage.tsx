import { useState, type FormEvent } from 'react'
import { useAuth, ApiClientError } from '@mosimi/shared'
import { CUSTOMER_APP_URL } from '../config'

export function ManagerLoginPage() {
  const { login, registerManager } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('seoyeon@mosimi.local')
  const [password, setPassword] = useState('manager123')
  const [name, setName] = useState('새매니저')
  const [region, setRegion] = useState('서울')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      if (mode === 'login') await login(email, password)
      else {
        await registerManager({
          email,
          password,
          name,
          region,
          specialties: ['병원 동행'],
          experienceYears: 1,
          bio: '새로 가입한 매니저입니다.',
        })
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : '로그인 실패',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="app-shell manager-mode">
      <div className="phone-frame manager-frame">
        <div className="page">
          <header className="page-header">
            <p className="brand-inline manager-brand">모시미+ 매니저</p>
            <h1>{mode === 'login' ? '매니저 로그인' : '매니저 회원가입'}</h1>
            <p className="muted">
              요청 수락·배정을 위해 매니저 계정으로 로그인하세요.
            </p>
          </header>

          <form className="booking-form" onSubmit={onSubmit}>
            {mode === 'register' && (
              <>
                <label>
                  이름
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label>
                  활동 지역
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              이메일
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary block" disabled={pending}>
              {pending
                ? '처리 중…'
                : mode === 'login'
                  ? '로그인'
                  : '가입하기'}
            </button>
          </form>

          <button
            type="button"
            className="text-link center-link"
            style={{ marginTop: 16, background: 'none', border: 'none' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '매니저 회원가입' : '로그인으로'}
          </button>

          <a href={CUSTOMER_APP_URL} className="text-link center-link">
            고객이신가요? 고객 앱에서 로그인 →
          </a>

          <p className="demo-note">
            시드 계정: seoyeon@mosimi.local / manager123
            <br />
            또는 junho / haneul / minji @mosimi.local
          </p>
        </div>
      </div>
    </div>
  )
}
