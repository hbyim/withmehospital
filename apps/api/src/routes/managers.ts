import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { execute, query } from '../db'
import { authMiddleware, requireRoles, type AppEnv } from '../lib/auth'
import {
  getManagerProfile,
  mapManager,
  type ManagerProfileRow,
  type UserRow,
} from '../lib/models'

export const managerRoutes = new Hono<AppEnv>()

managerRoutes.get('/', async (c) => {
  const onlineOnly = c.req.query('online') === '1'
  const rows = await query<UserRow & ManagerProfileRow>(
    `SELECT u.*,
            mp.user_id, mp.rating, mp.reviews, mp.experience_years,
            mp.specialties_json, mp.bio, mp.color, mp.online, mp.region
     FROM users u
     JOIN manager_profiles mp ON mp.user_id = u.id
     WHERE u.role = 'manager'
       ${onlineOnly ? 'AND mp.online = TRUE' : ''}
     ORDER BY mp.rating DESC, mp.reviews DESC`,
  )
  return c.json({
    managers: rows.map((r) =>
      mapManager(
        { id: r.id, name: r.name },
        {
          user_id: r.user_id,
          rating: r.rating,
          reviews: r.reviews,
          experience_years: r.experience_years,
          specialties_json: r.specialties_json,
          bio: r.bio,
          color: r.color,
          online: r.online,
          base_lat: null,
          base_lng: null,
          region: r.region,
        },
      ),
    ),
  })
})

managerRoutes.get('/:id', async (c) => {
  const rows = await query<UserRow & ManagerProfileRow>(
    `SELECT u.*,
            mp.user_id, mp.rating, mp.reviews, mp.experience_years,
            mp.specialties_json, mp.bio, mp.color, mp.online, mp.region
     FROM users u
     JOIN manager_profiles mp ON mp.user_id = u.id
     WHERE u.id = $1 AND u.role = 'manager'`,
    [c.req.param('id')],
  )
  const r = rows[0]
  if (!r) throw new HTTPException(404, { message: 'Manager not found' })
  return c.json({
    manager: mapManager(
      { id: r.id, name: r.name },
      {
        user_id: r.user_id,
        rating: r.rating,
        reviews: r.reviews,
        experience_years: r.experience_years,
        specialties_json: r.specialties_json,
        bio: r.bio,
        color: r.color,
        online: r.online,
        base_lat: null,
        base_lng: null,
        region: r.region,
      },
    ),
  })
})
const profileSchema = z.object({
  online: z.boolean().optional(),
  bio: z.string().optional(),
  region: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).optional(),
})

async function updateMyProfile(c: Context<AppEnv>) {
  const user = c.get('user')
  const body = profileSchema.parse(await c.req.json())
  const profile = await getManagerProfile(user.id)
  if (!profile) throw new HTTPException(404, { message: 'Profile not found' })

  await execute(
    `UPDATE manager_profiles SET
      online = COALESCE($1, online),
      bio = COALESCE($2, bio),
      region = COALESCE($3, region),
      specialties_json = COALESCE($4, specialties_json),
      experience_years = COALESCE($5, experience_years)
     WHERE user_id = $6`,
    [
      body.online ?? null,
      body.bio ?? null,
      body.region ?? null,
      body.specialties ? JSON.stringify(body.specialties) : null,
      body.experienceYears ?? null,
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