import { Hono } from 'hono'
import { authMiddleware, type AppEnv } from '../lib/auth'
import { getManagerProfile, getUser, mapManager } from '../lib/models'

export const meRoutes = new Hono<AppEnv>()

meRoutes.use('*', authMiddleware)

meRoutes.get('/', async (c) => {
  const auth = c.get('user')
  const user = await getUser(auth.id)
  if (!user) return c.json({ error: 'User not found' }, 404)

  let manager
  if (user.role === 'manager') {
    const profile = await getManagerProfile(user.id)
    if (profile) manager = mapManager(user, profile)
  }

  return c.json({
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
    manager,
  })
})
