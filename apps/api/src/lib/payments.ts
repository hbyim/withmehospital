import { query, queryOne } from '../db'
import { newId } from './models'

export type PaymentMode = 'toss' | 'stub'

export function paymentMode(): PaymentMode {
  return process.env.TOSS_SECRET_KEY && process.env.TOSS_CLIENT_KEY
    ? 'toss'
    : 'stub'
}

export function tossClientKey() {
  return process.env.TOSS_CLIENT_KEY || 'test_ck_stub'
}

export function getPaymentConfig() {
  const mode = paymentMode()
  return {
    mode,
    clientKey: tossClientKey(),
    stub: mode === 'stub',
  }
}

export async function getPaymentByOrderId(orderId: string) {
  return queryOne<{
    id: string
    booking_id: string
    amount: number
    status: string
    order_id: string
  }>('SELECT * FROM payments WHERE order_id = $1', [orderId])
}

function tossSecret() {
  return process.env.TOSS_SECRET_KEY || ''
}

export async function createPaymentReady(input: {
  bookingId: string
  amount: number
  orderName: string
}) {
  const orderId = newId('ord')
  const paymentId = newId('pay')
  await query(
    `INSERT INTO payments (id, booking_id, order_id, amount, status, provider)
     VALUES ($1, $2, $3, $4, 'ready', $5)`,
    [paymentId, input.bookingId, orderId, input.amount, paymentMode()],
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
    customerKey: `customer_${input.bookingId}`,
    clientKey: tossClientKey(),
    mode: paymentMode(),
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
    const auth = Buffer.from(`${tossSecret()}:`).toString('base64')
    const res = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
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
