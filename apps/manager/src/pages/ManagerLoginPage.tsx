import { useState, type FormEvent } from 'react'
import { useAuth, ApiClientError } from '@mosimi/shared'

export function ManagerLoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('seoyeon@mosimi.local')
  const [password, setPassword] = useState('manager123')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(email, password)
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
            <h1>매니저 로그인</h1>
            <p className="muted">요청 수락·배정을 위해 매니저 계정으로 로그인하세요.</p>
          </header>

          <form className="booking-form" onSubmit={onSubmit}>
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
              {pending ? '로그인 중…' : '로그인'}
            </button>
          </form>

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
