import { query, queryOne } from '../db'
import { newId } from './models'

export type PaymentMode = 'toss' | 'stub'
export type TossMethod = 'CARD' | 'TOSSPAY' | 'TRANSFER' | 'PHONE'

export function paymentMode(): PaymentMode {
  return process.env.TOSS_SECRET_KEY && process.env.TOSS_CLIENT_KEY
    ? 'toss'
    : 'stub'
}

export function tossClientKey() {
  return process.env.TOSS_CLIENT_KEY || 'test_ck_stub'
}

function tossSecret() {
  return process.env.TOSS_SECRET_KEY || ''
}

function tossAuthHeader() {
  return `Basic ${Buffer.from(`${tossSecret()}:`).toString('base64')}`
}

export function getPaymentConfig() {
  const mode = paymentMode()
  return {
    mode,
    clientKey: tossClientKey(),
    stub: mode === 'stub',
    methods: [
      { id: 'CARD' as const, label: '신용·체크카드' },
      { id: 'TOSSPAY' as const, label: '토스페이' },
      { id: 'TRANSFER' as const, label: '계좌이체' },
      { id: 'PHONE' as const, label: '휴대폰' },
    ],
    successPath: '/#/payment/success',
    failPath: '/#/payment/fail',
  }
}

export function tossMethodLabel(method: TossMethod): string {
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

export async function getPaymentByOrderId(orderId: string) {
  return queryOne<{
    id: string
    booking_id: string
    amount: number
    status: string
    order_id: string
    payment_key: string | null
    method: string | null
  }>('SELECT * FROM payments WHERE order_id = $1', [orderId])
}

export async function getPaidPaymentByBookingId(bookingId: string) {
  return queryOne<{
    id: string
    booking_id: string
    amount: number
    status: string
    order_id: string
    payment_key: string | null
  }>(
    `SELECT * FROM payments
     WHERE booking_id = $1 AND status = 'paid'
     ORDER BY updated_at DESC LIMIT 1`,
    [bookingId],
  )
}

export async function createPaymentReady(input: {
  bookingId: string
  amount: number
  orderName: string
  customerId: string
  method?: TossMethod
}) {
  const orderId = newId('ord')
  const paymentId = newId('pay')
  const method = input.method ?? 'CARD'
  await query(
    `INSERT INTO payments (id, booking_id, order_id, amount, status, provider, method)
     VALUES ($1, $2, $3, $4, 'ready', $5, $6)`,
    [paymentId, input.bookingId, orderId, input.amount, paymentMode(), method],
  )
  await query(
    `UPDATE bookings SET payment_status = 'pending', updated_at = NOW() WHERE id = $1`,
    [input.bookingId],
  )
  return {
    paymentId,
    orderId,
    amount: input.amount,
    orderName: input.orderName,
    customerKey: `cus_${input.customerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)}`,
    clientKey: tossClientKey(),
    mode: paymentMode(),
    method,
    methodLabel: tossMethodLabel(method),
  }
}

export async function confirmPayment(input: {
  paymentKey: string
  orderId: string
  amount: number
}) {
  const payment = await queryOne<{
    id: string
    booking_id: string
    amount: number
    status: string
  }>('SELECT * FROM payments WHERE order_id = $1', [input.orderId])

  if (!payment) throw new Error('Payment order not found')
  if (payment.amount !== input.amount) throw new Error('Amount mismatch')
  if (payment.status === 'paid') {
    return { alreadyPaid: true, bookingId: payment.booking_id }
  }

  let raw: unknown = { stub: true }
  if (paymentMode() === 'toss') {
    const res = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: tossAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey: input.paymentKey,
          orderId: input.orderId,
          amount: input.amount,
        }),
      },
    )
    raw = await res.json()
    if (!res.ok) {
      await query(
        `UPDATE payments SET status = 'failed', raw_json = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(raw), payment.id],
      )
      const message =
        typeof raw === 'object' && raw && 'message' in raw
          ? String((raw as { message: string }).message)
          : 'Toss confirm failed'
      throw new Error(message)
    }
  }

  await query(
    `UPDATE payments
     SET status = 'paid', payment_key = $1, raw_json = $2, updated_at = NOW()
     WHERE id = $3`,
    [input.paymentKey, JSON.stringify(raw), payment.id],
  )
  await query(
    `UPDATE bookings SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
    [payment.booking_id],
  )

  return { alreadyPaid: false, bookingId: payment.booking_id, raw }
}

export async function cancelTossPayment(input: {
  paymentKey: string
  cancelReason: string
  cancelAmount?: number
}) {
  if (paymentMode() === 'stub') {
    return {
      stub: true,
      paymentKey: input.paymentKey,
      cancelReason: input.cancelReason,
      cancelAmount: input.cancelAmount,
    }
  }

  const body: Record<string, unknown> = {
    cancelReason: input.cancelReason,
  }
  if (input.cancelAmount != null) body.cancelAmount = input.cancelAmount

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: tossAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotency-Key': newId('cnl'),
      },
      body: JSON.stringify(body),
    },
  )
  const raw = await res.json()
  if (!res.ok) {
    const message =
      typeof raw === 'object' && raw && 'message' in raw
        ? String((raw as { message: string }).message)
        : 'Toss cancel failed'
    throw new Error(message)
  }
  return raw
}

export async function refundBookingPayment(input: {
  bookingId: string
  cancelReason: string
}) {
  const payment = await getPaidPaymentByBookingId(input.bookingId)
  if (!payment?.payment_key) {
    return { refunded: false, reason: 'no_paid_payment' as const }
  }

  const raw = await cancelTossPayment({
    paymentKey: payment.payment_key,
    cancelReason: input.cancelReason,
  })

  await query(
    `UPDATE payments
     SET status = 'refunded',
         cancel_reason = $1,
         cancelled_at = NOW(),
         raw_json = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [input.cancelReason, JSON.stringify(raw), payment.id],
  )
  await query(
    `UPDATE bookings SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
    [input.bookingId],
  )

  return { refunded: true, paymentId: payment.id, raw }
}

/** Toss 웹훅 이벤트 반영 */
export async function applyTossWebhook(payload: Record<string, unknown>) {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const orderId = String(data.orderId ?? '')
  const paymentKey = data.paymentKey ? String(data.paymentKey) : null
  const status = String(data.status ?? payload.eventType ?? '')

  if (!orderId) return { ok: false, reason: 'no_order' }

  const payment = await getPaymentByOrderId(orderId)
  if (!payment) return { ok: false, reason: 'payment_not_found' }

  if (status === 'DONE' || status === 'PAYMENT_STATUS_CHANGED') {
    const st = String(data.status ?? '')
    if (st === 'DONE' || status === 'DONE') {
      await query(
        `UPDATE payments
         SET status = 'paid',
             payment_key = COALESCE($1, payment_key),
             raw_json = $2,
             updated_at = NOW()
         WHERE id = $3 AND status <> 'refunded'`,
        [paymentKey, JSON.stringify(payload), payment.id],
      )
      await query(
        `UPDATE bookings SET payment_status = 'paid', updated_at = NOW()
         WHERE id = $1 AND payment_status <> 'refunded'`,
        [payment.booking_id],
      )
    }
    if (st === 'CANCELED' || st === 'PARTIAL_CANCELED') {
      await query(
        `UPDATE payments
         SET status = 'refunded', cancelled_at = NOW(), raw_json = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(payload), payment.id],
      )
      await query(
        `UPDATE bookings SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [payment.booking_id],
      )
    }
  }

  return { ok: true, orderId, bookingId: payment.booking_id }
}
