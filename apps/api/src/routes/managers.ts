import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { execute, query } from '../db'
import { authMiddleware, requireRoles, type AppEnv } from '../lib/auth'
import { geocodeAddress } from '../lib/geo'
import {
  getManagerProfile,
  mapManager,
  type ManagerProfileRow,
  type UserRow,
} from '../lib/models'

export const managerRoutes = new Hono<AppEnv>()

function profileFromRow(r: UserRow & ManagerProfileRow): ManagerProfileRow {
  return {
    user_id: r.user_id,
    rating: r.rating,
    reviews: r.reviews,
    experience_years: r.experience_years,
    specialties_json: r.specialties_json,
    bio: r.bio,
    color: r.color,
    online: r.online,
    base_lat: r.base_lat,
    base_lng: r.base_lng,
    region: r.region,
    last_lat: r.last_lat ?? null,
    last_lng: r.last_lng ?? null,
    location_updated_at: r.location_updated_at ?? null,
    share_location: Boolean(r.share_location),
    location_consent_at: r.location_consent_at ?? null,
  }
}

const selectManagerSql = `SELECT u.*,
            mp.user_id, mp.rating, mp.reviews, mp.experience_years,
            mp.specialties_json, mp.bio, mp.color, mp.online, mp.region,
            mp.base_lat, mp.base_lng, mp.last_lat, mp.last_lng,
            mp.location_updated_at, mp.share_location, mp.location_consent_at
     FROM users u
     JOIN manager_profiles mp ON mp.user_id = u.id`

managerRoutes.get('/', async (c) => {
  const onlineOnly = c.req.query('online') === '1'
  const rows = await query<UserRow & ManagerProfileRow>(
    `${selectManagerSql}
     WHERE u.role = 'manager'
       ${onlineOnly ? 'AND mp.online = TRUE' : ''}
     ORDER BY mp.rating DESC, mp.reviews DESC`,
  )
  return c.json({
    managers: rows.map((r) =>
      mapManager({ id: r.id, name: r.name }, profileFromRow(r)),
    ),
  })
})

managerRoutes.get('/:id', async (c) => {
  const rows = await query<UserRow & ManagerProfileRow>(
    `${selectManagerSql}
     WHERE u.id = $1 AND u.role = 'manager'`,
    [c.req.param('id')],
  )
  const r = rows[0]
  if (!r) throw new HTTPException(404, { message: 'Manager not found' })
  return c.json({
    manager: mapManager({ id: r.id, name: r.name }, profileFromRow(r)),
  })
})

const profileSchema = z.object({
  online: z.boolean().optional(),
  bio: z.string().optional(),
  region: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).optional(),
  shareLocation: z.boolean().optional(),
  baseAddress: z.string().optional(),
})

async function updateMyProfile(c: Context<AppEnv>) {
  const user = c.get('user')
  const body = profileSchema.parse(await c.req.json())
  const profile = await getManagerProfile(user.id)
  if (!profile) throw new HTTPException(404, { message: 'Profile not found' })

  let baseLat: number | null | undefined
  let baseLng: number | null | undefined
  if (body.baseAddress?.trim()) {
    const geo = await geocodeAddress(body.baseAddress.trim())
    if (geo) {
      baseLat = geo.lat
      baseLng = geo.lng
    }
  }

  const shareLocation = body.shareLocation
  await execute(
    `UPDATE manager_profiles SET
      online = COALESCE($1, online),
      bio = COALESCE($2, bio),
      region = COALESCE($3, region),
      specialties_json = COALESCE($4, specialties_json),
      experience_years = COALESCE($5, experience_years),
      share_location = COALESCE($6, share_location),
      location_consent_at = CASE
        WHEN $6 IS TRUE THEN COALESCE(location_consent_at, NOW())
        WHEN $6 IS FALSE THEN location_consent_at
        ELSE location_consent_at
      END,
      base_lat = COALESCE($7, base_lat),
      base_lng = COALESCE($8, base_lng)
     WHERE user_id = $9`,
    [
      body.online ?? null,
      body.bio ?? null,
      body.region ?? null,
      body.specialties ? JSON.stringify(body.specialties) : null,
      body.experienceYears ?? null,
      shareLocation ?? null,
      baseLat ?? null,
      baseLng ?? null,
      user.id,
    ],
  )

  const updated = await getManagerProfile(user.id)
  const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1', [
    user.id,
  ])
  return c.json({ manager: mapManager(rows[0]!, updated!) })
}

managerRoutes.patch(
  '/me',
  authMiddleware,
  requireRoles('manager'),
  updateMyProfile,
)

managerRoutes.patch(
  '/me/profile',
  authMiddleware,
  requireRoles('manager'),
  updateMyProfile,
)

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

/** 실시간 위치 업데이트 (공유 동의 필요) */
managerRoutes.post(
  '/me/location',
  authMiddleware,
  requireRoles('manager'),
  async (c) => {
    const user = c.get('user')
    const body = locationSchema.parse(await c.req.json())
    const profile = await getManagerProfile(user.id)
    if (!profile) throw new HTTPException(404, { message: 'Profile not found' })
    if (!profile.share_location) {
      throw new HTTPException(403, {
        message: '위치 공유에 동의한 뒤 전송할 수 있습니다.',
      })
    }

    await execute(
      `UPDATE manager_profiles
       SET last_lat = $1,
           last_lng = $2,
           location_updated_at = NOW(),
           base_lat = COALESCE(base_lat, $1),
           base_lng = COALESCE(base_lng, $2)
       WHERE user_id = $3`,
      [body.lat, body.lng, user.id],
    )

    const updated = await getManagerProfile(user.id)
    return c.json({
      ok: true,
      location: { lat: body.lat, lng: body.lng },
      locationUpdatedAt: updated?.location_updated_at,
      shareLocation: updated?.share_location,
    })
  },
)
