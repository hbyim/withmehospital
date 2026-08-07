import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { confirmTossPayment } from '@mosimi/shared'

export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = Number(params.get('amount') || 0)
    if (!paymentKey || !orderId || !amount) {
      setError('결제 정보가 없습니다.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const data = await confirmTossPayment({ paymentKey, orderId, amount })
        if (cancelled) return
        setDone(true)
        navigate(`/detail/${data.booking.id}`, { replace: true })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '결제 확정 실패')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params, navigate])

  return (
    <div className="page matching-page">
      <p className="brand-inline">모시미+</p>
      <h1>결제 확인</h1>
      {error ? (
        <>
          <p className="muted">{error}</p>
          <Link to="/history" className="btn primary block">
            내역으로
          </Link>
        </>
      ) : (
        <p className="muted">{done ? '완료' : '결제를 확정하는 중…'}</p>
      )}
    </div>
  )
}

export function PaymentFailPage() {
  const [params] = useSearchParams()
  const message = params.get('message') || '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="page matching-page">
      <p className="brand-inline">모시미+</p>
      <h1>결제 실패</h1>
      <p className="muted">{message}</p>
      <Link to="/history" className="btn primary block">
        내역으로
      </Link>
    </div>
  )
}
