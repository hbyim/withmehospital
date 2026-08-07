import { useState, type FormEvent } from 'react'
import { useAuth, ApiClientError } from '@mosimi/shared'
import { MANAGER_APP_URL } from '../config'

export function CustomerLoginPage() {
  const { login, registerCustomer } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('customer@mosimi.local')
  const [password, setPassword] = useState('customer123')
  const [name, setName] = useState('김모시')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      if (mode === 'login') await login(email, password)
      else await registerCustomer({ email, password, name })
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
    <div className="app-shell">
      <div className="phone-frame">
        <div className="page">
          <header className="page-header">
            <p className="brand-inline">모시미+</p>
            <h1>{mode === 'login' ? '고객 로그인' : '고객 회원가입'}</h1>
            <p className="muted">API 연동 계정으로 예약·결제를 이용합니다.</p>
          </header>

          <form className="booking-form" onSubmit={onSubmit}>
            {mode === 'register' && (
              <label>
                이름
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
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
              {pending ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </form>

          <button
            type="button"
            className="text-link center-link"
            style={{ marginTop: 16, background: 'none', border: 'none' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '회원가입' : '로그인으로'}
          </button>

          <a href={MANAGER_APP_URL} className="text-link center-link">
            매니저이신가요? 매니저 앱에서 로그인 →
          </a>

          <p className="demo-note">
            시드 계정: customer@mosimi.local / customer123
          </p>
        </div>
      </div>
    </div>
  )
}
