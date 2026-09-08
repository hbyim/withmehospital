import { api } from '../api/client'
import type { Booking } from '../store/BookingContext'

export type TossMethod = 'CARD' | 'TOSSPAY' | 'TRANSFER' | 'PHONE'

export type PaymentReady = {
  paymentId: string
  orderId: string
  amount: number
  orderName: string
  customerKey: string
  clientKey: string
  mode: 'toss' | 'stub'
  method?: TossMethod
  methodLabel?: string
}

export type PaymentConfig = {
  mode: 'toss' | 'stub'
  clientKey: string
  stub: boolean
  methods: Array<{ id: TossMethod; label: string }>
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

function tossSdkMethod(method: TossMethod): string {
  switch (method) {
    case 'TOSSPAY':
      return '토스페이'
    case 'TRANSFER':
      return '계좌이체'
    case 'PHONE':
      return '휴대폰'
    case 'CARD':
    default:
      return '카드'
  }
}

export async function getPaymentConfig() {
  return api<PaymentConfig>('/api/payments/config')
}

export async function prepareBookingPayment(
  bookingId: string,
  method: TossMethod = 'CARD',
) {
  return api<{ payment: PaymentReady }>(
    `/api/bookings/${bookingId}/payments/ready`,
    { method: 'POST', body: JSON.stringify({ method }) },
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

export async function refundBookingPayment(
  bookingId: string,
  cancelReason = '고객 요청 환불',
) {
  return api<{ booking: Booking; refund: unknown }>('/api/payments/refund', {
    method: 'POST',
    body: JSON.stringify({ bookingId, cancelReason }),
  })
}

/** ready → stub 즉시 확정 또는 Toss 결제창 (카드/토스페이/계좌/휴대폰) */
export async function startBookingPayment(
  bookingId: string,
  method: TossMethod = 'CARD',
) {
  const { payment } = await prepareBookingPayment(bookingId, method)

  if (payment.mode === 'stub') {
    return confirmStubPayment(payment.orderId, payment.amount)
  }

  await loadTossScript()
  if (!window.TossPayments) {
    throw new Error('Toss Payments SDK를 불러오지 못했습니다.')
  }

  const toss = window.TossPayments(payment.clientKey)
  await toss.requestPayment(tossSdkMethod(payment.method ?? method), {
    amount: payment.amount,
    orderId: payment.orderId,
    orderName: payment.orderName,
    customerName: payment.customerKey,
    successUrl: paymentCallbackUrl('success'),
    failUrl: paymentCallbackUrl('fail'),
  })

  return null
}
