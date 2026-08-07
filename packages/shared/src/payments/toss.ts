import { api } from '../api/client'
import type { Booking } from '../store/BookingContext'

export type PaymentReady = {
  paymentId: string
  orderId: string
  amount: number
  orderName: string
  customerKey: string
  clientKey: string
  mode: 'toss' | 'stub'
}

export type PaymentConfig = {
  mode: 'toss' | 'stub'
  clientKey: string
  stub: boolean
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: Record<string, unknown>,
      ) => Promise<void>
    }
  }
}

function loadTossScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.TossPayments) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-toss-payments]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Toss script failed')),
      )
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment'
    script.async = true
    script.dataset.tossPayments = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Toss script failed'))
    document.head.appendChild(script)
  })
}

function paymentCallbackUrl(kind: 'success' | 'fail') {
  return new URL(`payment-${kind}.html`, window.location.href).href
}

export async function getPaymentConfig() {
  return api<PaymentConfig>('/api/payments/config')
}

export async function prepareBookingPayment(bookingId: string) {
  return api<{ payment: PaymentReady }>(
    `/api/bookings/${bookingId}/payments/ready`,
    { method: 'POST' },
  )
}

export async function confirmStubPayment(orderId: string, amount: number) {
  return api<{ booking: Booking }>('/api/payments/confirm-stub', {
    method: 'POST',
    body: JSON.stringify({ orderId, amount }),
  })
}

export async function confirmTossPayment(input: {
  paymentKey: string
  orderId: string
  amount: number
}) {
  return api<{ booking: Booking }>('/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** ready → stub 즉시 확정 또는 Toss 결제창 */
export async function startBookingPayment(bookingId: string) {
  const { payment } = await prepareBookingPayment(bookingId)

  if (payment.mode === 'stub') {
    return confirmStubPayment(payment.orderId, payment.amount)
  }

  await loadTossScript()
  if (!window.TossPayments) {
    throw new Error('Toss Payments SDK를 불러오지 못했습니다.')
  }

  const toss = window.TossPayments(payment.clientKey)
  await toss.requestPayment('카드', {
    amount: payment.amount,
    orderId: payment.orderId,
    orderName: payment.orderName,
    customerName: payment.customerKey,
    successUrl: paymentCallbackUrl('success'),
    failUrl: paymentCallbackUrl('fail'),
  })

  // Toss는 리다이렉트하므로 여기까지 오면 보통 취소/닫기
  return null
}
