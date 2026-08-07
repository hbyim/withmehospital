import { resolve } from 'node:path'
import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { migrate } from './db'
import { type AppEnv } from './lib/auth'
import { authRoutes } from './routes/auth'
import { bookingRoutes } from './routes/bookings'
import { managerRoutes } from './routes/managers'
import { meRoutes } from './routes/me'
import { paymentRoutes } from './routes/payments'
import { pushRoutes } from './routes/push'
import { serviceRoutes } from './routes/services'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), 'apps/api/.env') })
config()

const app = new Hono<AppEnv>()

const origins = (
  process.env.CORS_ORIGIN ||
  [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://hbyim.github.io',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const localDevOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

function resolveCorsOrigin(origin: string) {
  if (origins.includes('*')) return origin || '*'
  if (origins.includes(origin)) return origin
  // localhost / 127.0.0.1 포트 차이는 로컬 개발에서 허용
  if (localDevOrigin.test(origin)) return origin
  return origins[0] ?? origin
}

app.use(
  '*',
  cors({
    origin: (origin) => (origin ? resolveCorsOrigin(origin) : '*'),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/health', (c) =>
  c.json({ ok: true, service: 'mosimi-api', time: new Date().toISOString() }),
)

app.route('/api/auth', authRoutes)
app.route('/api/services', serviceRoutes)
app.route('/api/bookings', bookingRoutes)
app.route('/api/managers', managerRoutes)
app.route('/api/me', meRoutes)
app.route('/api/payments', paymentRoutes)
app.route('/api/push', pushRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  if (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError') {
    return c.json({ error: 'Validation failed', details: err }, 400)
  }
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  if (
    message.includes('Payment') ||
    message.includes('Amount') ||
    message.includes('Toss')
  ) {
    return c.json({ error: message }, 400)
  }
  return c.json({ error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT || 8787)
const hostname = process.env.HOST || '0.0.0.0'

await migrate()

if (process.env.SEED_ON_BOOT === '1') {
  const { default: seedMain } = await import('./seed-boot')
  await seedMain()
}

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`모시미 API listening on http://${hostname}:${info.port}`)
})

export default app
