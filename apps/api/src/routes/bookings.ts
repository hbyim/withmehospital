import { Hono } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { execute, query, queryOne, withTransaction } from '../db'
import { authMiddleware, requireRoles, type AppEnv } from '../lib/auth'
import {
  allowedTransitions,
  calcPrice,
  getManagerProfile,
  getService,
  mapBooking,
  mapBookings,
  newId,
  type BookingRow,
  type BookingStatus,
} from '../lib/models'
import {
  effectiveManagerLocation,
  geocodeAddress,
  haversineKm,
} from '../lib/geo'
import { sendPushToUser, appDeepLink } from '../lib/push'
import { createPaymentReady, refundBookingPayment } from '../lib/payments'

const createSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  durationHours: z.number().int().min(1).max(24),
  pickup: z.string().min(1),
  destination: z.string().min(1),
  careTarget: z.string().min(1),
  note: z.string().default(''),
})

const statusSchema = z.object({
  status: z.enum([
    'matching',
    'matched',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]),
})

export const bookingRoutes = new Hono<AppEnv>()

bookingRoutes.use('*', authMiddleware)

bookingRoutes.get('/', async (c) => {
  const user = c.get('user')
  const scope = c.req.query('scope')
  let rows: BookingRow[] = []

  if (user.role === 'customer') {
    rows = await query<BookingRow>(
      `SELECT * FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC`,
      [user.id],
    )
  } else if (user.role === 'manager') {
    if (scope === 'open') {
      rows = await query<BookingRow>(
        `SELECT b.* FROM bookings b
         WHERE b.status = 'matching' AND b.manager_id IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM booking_declines d
             WHERE d.booking_id = b.id AND d.manager_id = $1
           )
         ORDER BY b.created_at DESC`,
        [user.id],
      )
    } else if (scope === 'mine') {
      rows = await query<BookingRow>(
        `SELECT * FROM bookings WHERE manager_id = $1 ORDER BY date DESC, time DESC`,
        [user.id],
      )
    } else {
      rows = await query<BookingRow>(
        `SELECT b.* FROM bookings b
         WHERE b.manager_id = $1
            OR (
              b.status = 'matching' AND b.manager_id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM booking_declines d
                WHERE d.booking_id = b.id AND d.manager_id = $1
              )
            )
         ORDER BY b.created_at DESC`,
        [user.id],
      )
    }
  } else {
    rows = await query<BookingRow>(
      `SELECT * FROM bookings ORDER BY created_at DESC`,
    )
  }

  return c.json({ bookings: await mapBookings(rows) })
})

bookingRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [c.req.param('id')],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })

  if (user.role === 'customer' && row.customer_id !== user.id) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }
  if (
    user.role === 'manager' &&
    row.manager_id &&
    row.manager_id !== user.id &&
    row.status !== 'matching'
  ) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }

  return c.json({ booking: await mapBooking(row) })
})

/** 실시간 위치 트래킹 스냅샷 */
bookingRoutes.get('/:id/tracking', async (c) => {
  const user = c.get('user')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [c.req.param('id')],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })

  const allowed =
    user.role === 'admin' ||
    (user.role === 'customer' && row.customer_id === user.id) ||
    (user.role === 'manager' && row.manager_id === user.id)
  if (!allowed) throw new HTTPException(403, { message: 'Forbidden' })

  const trackable = ['matched', 'confirmed', 'in_progress'].includes(row.status)
  let managerLocation: { lat: number; lng: number } | null = null
  let locationUpdatedAt: string | null = null
  let shareLocation = false
  let distanceToPickupKm: number | null = null

  if (row.manager_id && trackable) {
    const profile = await getManagerProfile(row.manager_id)
    if (profile) {
      shareLocation = Boolean(profile.share_location)
      locationUpdatedAt = profile.location_updated_at
      const loc = effectiveManagerLocation(profile)
      // 고객에게는 공유 ON + 진행 상태에서만 실시간 좌표 노출
      if (
        loc &&
        (user.role === 'manager' ||
          user.role === 'admin' ||
          (shareLocation && ['confirmed', 'in_progress'].includes(row.status)))
      ) {
        managerLocation = loc
      } else if (
        loc &&
        user.role === 'customer' &&
        row.status === 'matched' &&
        profile.base_lat != null
      ) {
        // 배정 직후엔 거점만
        managerLocation = {
          lat: profile.base_lat,
          lng: profile.base_lng!,
        }
      }
      if (
        managerLocation &&
        row.pickup_lat != null &&
        row.pickup_lng != null
      ) {
        distanceToPickupKm = haversineKm(managerLocation, {
          lat: row.pickup_lat,
          lng: row.pickup_lng,
        })
      }
    }
  }

  return c.json({
    bookingId: row.id,
    status: row.status,
    trackingActive: trackable && Boolean(managerLocation),
    shareLocation,
    managerLocation,
    locationUpdatedAt,
    distanceToPickupKm,
    pickup: {
      address: row.pickup,
      location:
        row.pickup_lat != null && row.pickup_lng != null
          ? { lat: row.pickup_lat, lng: row.pickup_lng }
          : null,
    },
    destination: {
      address: row.destination,
      location:
        row.dest_lat != null && row.dest_lng != null
          ? { lat: row.dest_lat, lng: row.dest_lng }
          : null,
    },
    polledAt: new Date().toISOString(),
  })
})

bookingRoutes.post('/', requireRoles('customer'), async (c) => {
  const user = c.get('user')
  const body = createSchema.parse(await c.req.json())
  const service = await getService(body.serviceId)
  if (!service) throw new HTTPException(400, { message: 'Invalid service' })

  const id = newId('bk')
  const price = calcPrice(service.base_price, body.durationHours)
  const [pickupGeo, destGeo] = await Promise.all([
    geocodeAddress(body.pickup),
    geocodeAddress(body.destination),
  ])

  await execute(
    `INSERT INTO bookings (
      id, customer_id, service_id, status, date, time, duration_hours,
      pickup, destination, care_target, note, price, payment_status, customer_name,
      pickup_lat, pickup_lng, dest_lat, dest_lng
    ) VALUES ($1, $2, $3, 'matching', $4, $5, $6, $7, $8, $9, $10, $11, 'unpaid', $12,
      $13, $14, $15, $16)`,
    [
      id,
      user.id,
      service.id,
      body.date,
      body.time,
      body.durationHours,
      body.pickup,
      body.destination,
      body.careTarget,
      body.note,
      price,
      user.name,
      pickupGeo?.lat ?? null,
      pickupGeo?.lng ?? null,
      destGeo?.lat ?? null,
      destGeo?.lng ?? null,
    ],
  )

  // 거리 가까운 온라인 매니저 우선 푸시
  const managers = await query<{
    user_id: string
    last_lat: number | null
    last_lng: number | null
    base_lat: number | null
    base_lng: number | null
  }>(
    `SELECT user_id, last_lat, last_lng, base_lat, base_lng
     FROM manager_profiles WHERE online = TRUE`,
  )
  const ranked = managers
    .map((m) => {
      const loc = effectiveManagerLocation(m)
      const distanceKm =
        loc && pickupGeo ? haversineKm(loc, pickupGeo) : 999
      return { user_id: m.user_id, distanceKm }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)

  await Promise.all(
    ranked.slice(0, 30).map((m) =>
      sendPushToUser(m.user_id, {
        title: '새 서비스 요청',
        body:
          m.distanceKm < 900
            ? `${service.name} · 약 ${m.distanceKm}km · ${body.date} ${body.time}`
            : `${service.name} · ${body.date} ${body.time}`,
        url: appDeepLink('manager', '/requests'),
        data: { bookingId: id },
      }),
    ),
  )

  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [id],
  )
  return c.json({ booking: await mapBooking(row!) }, 201)
})

bookingRoutes.post('/:id/accept', requireRoles('manager'), async (c) => {
  const user = c.get('user')
  const profile = await getManagerProfile(user.id)
  if (!profile) throw new HTTPException(400, { message: 'Manager profile missing' })
  if (!profile.online) {
    throw new HTTPException(400, { message: 'Manager is offline' })
  }

  const bookingId = c.req.param('id')
  const updated = await withTransaction(async (client) => {
    const rowRes = await client.query<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId],
    )
    const row = rowRes.rows[0]
    if (!row) throw new HTTPException(404, { message: 'Booking not found' })
    if (row.status !== 'matching' || row.manager_id) {
      throw new HTTPException(409, { message: 'Already taken or unavailable' })
    }

    const declined = await client.query(
      'SELECT 1 FROM booking_declines WHERE booking_id = $1 AND manager_id = $2',
      [bookingId, user.id],
    )
    if (declined.rowCount) {
      throw new HTTPException(400, { message: 'You already declined this request' })
    }

    await client.query(
      `UPDATE bookings
       SET manager_id = $1, status = 'matched', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'matching' AND manager_id IS NULL`,
      [user.id, bookingId],
    )

    const check = await client.query<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId],
    )
    const next = check.rows[0]
    if (!next || next.manager_id !== user.id) {
      throw new HTTPException(409, { message: 'Already taken by another manager' })
    }
    return next
  })

  await sendPushToUser(updated.customer_id, {
    title: '매니저가 배정되었습니다',
    body: `${user.name} 매니저가 요청을 수락했습니다.`,
    url: appDeepLink('customer', `/detail/${updated.id}`),
    data: { bookingId: updated.id },
  })

  return c.json({ booking: await mapBooking(updated) })
})

bookingRoutes.post('/:id/decline', requireRoles('manager'), async (c) => {
  const user = c.get('user')
  const bookingId = c.req.param('id')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })
  if (row.status !== 'matching') {
    throw new HTTPException(400, { message: 'Only open requests can be declined' })
  }

  await execute(
    `INSERT INTO booking_declines (booking_id, manager_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [bookingId, user.id],
  )
  return c.json({ ok: true })
})

bookingRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user')
  const body = statusSchema.parse(await c.req.json())
  const bookingId = c.req.param('id')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })

  const next = body.status as BookingStatus
  if (!allowedTransitions[row.status].includes(next)) {
    throw new HTTPException(400, {
      message: `Cannot transition from ${row.status} to ${next}`,
    })
  }

  if (user.role === 'customer') {
    if (row.customer_id !== user.id) throw new HTTPException(403, { message: 'Forbidden' })
    if (!['confirmed', 'cancelled'].includes(next)) {
      throw new HTTPException(403, { message: 'Customers can only confirm or cancel' })
    }
  } else if (user.role === 'manager') {
    if (row.manager_id !== user.id) throw new HTTPException(403, { message: 'Forbidden' })
    if (!['in_progress', 'completed', 'cancelled'].includes(next)) {
      throw new HTTPException(403, {
        message: 'Managers can start, complete, or cancel assigned jobs',
      })
    }
  }

  const managerId = next === 'matching' ? null : row.manager_id
  await execute(
    `UPDATE bookings
     SET status = $1,
         manager_id = $2,
         updated_at = NOW(),
         accepted_at = CASE WHEN $1 = 'matching' THEN NULL ELSE accepted_at END
     WHERE id = $3`,
    [next, managerId, bookingId],
  )

  // 결제 완료 건 취소 시 자동 환불
  if (next === 'cancelled' && row.payment_status === 'paid') {
    try {
      await refundBookingPayment({
        bookingId,
        cancelReason: `${user.role} cancelled booking`,
      })
    } catch (err) {
      console.error('[payments] auto-refund failed', err)
    }
  }

  const updated = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )

  if (updated?.manager_id && user.role === 'customer' && next === 'confirmed') {
    await sendPushToUser(updated.manager_id, {
      title: '고객이 예약을 확정했습니다',
      body: `${updated.date} ${updated.time} 일정이 확정되었습니다.`,
      url: appDeepLink('manager', `/jobs/${updated.id}`),
    })
  }
  if (updated?.customer_id && user.role === 'manager') {
    if (next === 'in_progress') {
      await sendPushToUser(updated.customer_id, {
        title: '서비스가 시작되었습니다',
        body: '매니저가 서비스를 시작했습니다.',
        url: appDeepLink('customer', `/detail/${updated.id}`),
      })
    }
    if (next === 'completed') {
      await sendPushToUser(updated.customer_id, {
        title: '서비스가 완료되었습니다',
        body: '결제를 진행해 주세요.',
        url: appDeepLink('customer', `/detail/${updated.id}`),
      })
    }
  }

  return c.json({ booking: await mapBooking(updated!) })
})

bookingRoutes.post('/:id/payments/ready', requireRoles('customer'), async (c) => {
  const user = c.get('user')
  const bookingId = c.req.param('id')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })
  if (row.customer_id !== user.id) throw new HTTPException(403, { message: 'Forbidden' })
  if (!['matched', 'confirmed', 'in_progress', 'completed'].includes(row.status)) {
    throw new HTTPException(400, { message: 'Booking not payable yet' })
  }
  if (row.payment_status === 'paid') {
    throw new HTTPException(400, { message: 'Already paid' })
  }

  const booking = await mapBooking(row)
  let method: 'CARD' | 'TOSSPAY' | 'TRANSFER' | 'PHONE' | undefined
  try {
    const raw = await c.req.json()
    const parsed = z
      .object({
        method: z.enum(['CARD', 'TOSSPAY', 'TRANSFER', 'PHONE']).optional(),
      })
      .safeParse(raw)
    if (parsed.success) method = parsed.data.method
  } catch {
    // no body
  }

  const ready = await createPaymentReady({
    bookingId: row.id,
    amount: row.price,
    orderName: `${booking.service.name} ${row.date}`,
    customerId: user.id,
    method,
  })
  return c.json({ payment: ready })
})

/** @deprecated use /payments/ready + /api/payments/confirm */
bookingRoutes.post('/:id/pay', requireRoles('customer'), async (c) => {
  const user = c.get('user')
  const bookingId = c.req.param('id')
  const row = await queryOne<BookingRow>(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )
  if (!row) throw new HTTPException(404, { message: 'Booking not found' })
  if (row.customer_id !== user.id) throw new HTTPException(403, { message: 'Forbidden' })

  const booking = await mapBooking(row)
  const ready = await createPaymentReady({
    bookingId: row.id,
    amount: row.price,
    orderName: `${booking.service.name} ${row.date}`,
    customerId: user.id,
  })
  return c.json({
    booking,
    payment: ready,
    message: 'POST /api/payments/confirm 로 결제를 완료하세요.',
  })
})
