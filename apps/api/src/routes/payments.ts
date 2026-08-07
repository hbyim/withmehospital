import { Hono } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, requireRoles, type AppEnv } from '../lib/auth'
import {
  confirmPayment,
  getPaymentConfig,
  getPaymentByOrderId,
} from '../lib/payments'
import { queryOne } from '../db'
import type { BookingRow } from '../lib/models'
import { mapBooking } from '../lib/models'
import { sendPushToUser } from '../lib/push'

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
        url: `/#/jobs/${booking.id}`,
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

/** 스텁 모드: paymentKey 없이 orderId만으로 결제 완료 */
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
