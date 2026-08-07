import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

export type Role = 'customer' | 'manager' | 'admin'

export type AuthUser = {
  id: string
  role: Role
  email: string
  name: string
}

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'mosimi-dev-secret-change-me-in-production',
  )

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function signToken(user: AuthUser) {
  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, secret())
  if (!payload.sub || typeof payload.role !== 'string') {
    throw new HTTPException(401, { message: 'Invalid token' })
  }
  return {
    id: payload.sub,
    role: payload.role as Role,
    email: String(payload.email || ''),
    name: String(payload.name || ''),
  }
}

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  const user = await verifyToken(header.slice(7))
  c.set('user', user)
  await next()
}

export function requireRoles(...roles: Role[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
    await next()
  }
}
