import { Hono } from 'hono'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { execute, queryOne, withTransaction } from '../db'
import {
  hashPassword,
  signToken,
  verifyPassword,
  type AuthUser,
} from '../lib/auth'
import {
  getManagerProfile,
  mapManager,
  newId,
  type UserRow,
} from '../lib/models'

const registerCustomerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
})

const registerManagerSchema = registerCustomerSchema.extend({
  specialties: z.array(z.string()).default([]),
  experienceYears: z.number().int().min(0).default(0),
  bio: z.string().default(''),
  region: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRoutes = new Hono()

authRoutes.post('/register/customer', async (c) => {
  const body = registerCustomerSchema.parse(await c.req.json())
  const exists = await queryOne('SELECT id FROM users WHERE email = $1', [
    body.email,
  ])
  if (exists) throw new HTTPException(409, { message: 'Email already registered' })

  const id = newId('cus')
  const passwordHash = await hashPassword(body.password)
  await execute(
    `INSERT INTO users (id, role, email, phone, name, password_hash)
     VALUES ($1, 'customer', $2, $3, $4, $5)`,
    [id, body.email, body.phone ?? null, body.name, passwordHash],
  )

  const user: AuthUser = {
    id,
    role: 'customer',
    email: body.email,
    name: body.name,
  }
  return c.json({ token: await signToken(user), user })
})

authRoutes.post('/register/manager', async (c) => {
  const body = registerManagerSchema.parse(await c.req.json())
  const exists = await queryOne('SELECT id FROM users WHERE email = $1', [
    body.email,
  ])
  if (exists) throw new HTTPException(409, { message: 'Email already registered' })

  const id = newId('mgr')
  const passwordHash = await hashPassword(body.password)
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (id, role, email, phone, name, password_hash)
       VALUES ($1, 'manager', $2, $3, $4, $5)`,
      [id, body.email, body.phone ?? null, body.name, passwordHash],
    )
    await client.query(
      `INSERT INTO manager_profiles
       (user_id, rating, reviews, experience_years, specialties_json, bio, color, online, region)
       VALUES ($1, 5.0, 0, $2, $3, $4, '#2F4F7A', TRUE, $5)`,
      [
        id,
        body.experienceYears,
        JSON.stringify(body.specialties),
        body.bio,
        body.region ?? null,
      ],
    )
  })

  const user: AuthUser = {
    id,
    role: 'manager',
    email: body.email,
    name: body.name,
  }
  return c.json({ token: await signToken(user), user })
})

authRoutes.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json())
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [
    body.email,
  ])
  if (!row || !(await verifyPassword(body.password, row.password_hash))) {
    throw new HTTPException(401, { message: 'Invalid email or password' })
  }

  const user: AuthUser = {
    id: row.id,
    role: row.role,
    email: row.email,
    name: row.name,
  }
  const token = await signToken(user)

  let manager
  if (row.role === 'manager') {
    const profile = await getManagerProfile(row.id)
    if (profile) manager = mapManager(row, profile)
  }

  return c.json({ token, user, manager })
})
