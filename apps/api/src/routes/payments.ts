import { Hono } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, requireRoles, type AppEnv } from '../lib/auth'
import {
  applyTossWebhook,
  confirmPayment,
  getPaymentConfig,
  getPaymentByOrderId,
  refundBookingPayment,
  type TossMethod,
} from '../lib/payments'
import { queryOne } from '../db'
import type { BookingRow } from '../lib/models'
import { mapBooking } from '../lib/models'
import { sendPushToUser, appDeepLink } from '../lib/push'

export const paymentRoutes = new Hono<AppEnv>()

paymentRoutes.get('/config', (c) => c.json(getPaymentConfig()))

const confirmSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
})

paymentRoutes.post(
  '/confirm',
  authMiddleware,
  requireRoles('customer'),
  async (c) => {
    const user = c.get('user')
    const body = confirmSchema.parse(await c.req.json())

    const payment = await getPaymentByOrderId(body.orderId)
    if (!payment) {
      throw new HTTPException(404, { message: 'Payment order not found' })
    }

    const booking = await queryOne<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [payment.booking_id],
    )
    if (!booking || booking.customer_id !== user.id) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }

    const result = await confirmPayment({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
    })

    if (booking.manager_id) {
      await sendPushToUser(booking.manager_id, {
        title: '결제 완료',
        body: `고객이 ${booking.price.toLocaleString('ko-KR')}원 결제를 완료했습니다.`,
        url: appDeepLink('manager', `/jobs/${booking.id}`),
      })
    }

    const updated = await queryOne<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [booking.id],
    )
    return c.json({
      payment: result,
      booking: await mapBooking(updated!),
    })
  },
)

paymentRoutes.post(
  '/confirm-stub',
  authMiddleware,
  requireRoles('customer'),
  async (c) => {
    const user = c.get('user')
    const body = z
      .object({ orderId: z.string().min(1), amount: z.number().int().positive() })
      .parse(await c.req.json())

    const config = getPaymentConfig()
    if (!config.stub) {
      throw new HTTPException(400, {
        message: 'Stub confirm only available when Toss keys are not set',
      })
    }

    const payment = await getPaymentByOrderId(body.orderId)
    if (!payment) {
      throw new HTTPException(404, { message: 'Payment order not found' })
    }

    const booking = await queryOne<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [payment.booking_id],
    )
    if (!booking || booking.customer_id !== user.id) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }

    const result = await confirmPayment({
      paymentKey: `stub_${Date.now()}`,
      orderId: body.orderId,
      amount: body.amount,
    })

    const updated = await queryOne<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [booking.id],
    )
    return c.json({
      payment: result,
      booking: await mapBooking(updated!),
    })
  },
)

const refundSchema = z.object({
  bookingId: z.string().min(1),
  cancelReason: z.string().min(1).max(200).default('고객 요청 환불'),
})

paymentRoutes.post(
  '/refund',
  authMiddleware,
  requireRoles('customer', 'admin'),
  async (c) => {
    const user = c.get('user')
    const body = refundSchema.parse(await c.req.json())
    const booking = await queryOne<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [body.bookingId],
    )
    if (!booking) throw new HTTPException(404, { message: 'Booking not found' })
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
    if (booking.payment_status !== 'paid') {
      throw new HTTPException(400, { message: 'Paid payment required' })
    }

    try {
      const result = await refundBookingPayment({
        bookingId: body.bookingId,
        cancelReason: body.cancelReason,
      })
      const updated = await queryOne<BookingRow>(
        'SELECT * FROM bookings WHERE id = $1',
        [body.bookingId],
      )
      if (booking.manager_id) {
        await sendPushToUser(booking.manager_id, {
          title: '결제 환불',
          body: '고객 예약 결제가 환불되었습니다.',
          url: appDeepLink('manager', `/jobs/${booking.id}`),
        })
      }
      return c.json({
        refund: result,
        booking: await mapBooking(updated!),
      })
    } catch (err) {
      throw new HTTPException(400, {
        message: err instanceof Error ? err.message : 'Refund failed',
      })
    }
  },
)

/** Toss 웹훅 (서명 검증은 TOSS_WEBHOOK_SECRET 설정 시 확장) */
paymentRoutes.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as Record<string, unknown>
  const result = await applyTossWebhook(payload)
  return c.json(result)
})

export type { TossMethod }
