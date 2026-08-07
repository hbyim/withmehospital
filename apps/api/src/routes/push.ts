import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, type AppEnv } from '../lib/auth'
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from '../lib/push'

export const pushRoutes = new Hono<AppEnv>()

pushRoutes.get('/vapid-public-key', (c) => {
  const key = getVapidPublicKey()
  return c.json({ publicKey: key, enabled: Boolean(key) })
})

pushRoutes.use('*', authMiddleware)

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

pushRoutes.post('/subscribe', async (c) => {
  const user = c.get('user')
  const body = subSchema.parse(await c.req.json())
  await savePushSubscription(user.id, {
    endpoint: body.endpoint,
    keys: body.keys,
  })
  return c.json({ ok: true })
})

pushRoutes.delete('/subscribe', async (c) => {
  const user = c.get('user')
  const body = z.object({ endpoint: z.string().url() }).parse(await c.req.json())
  await removePushSubscription(user.id, body.endpoint)
  return c.json({ ok: true })
})
