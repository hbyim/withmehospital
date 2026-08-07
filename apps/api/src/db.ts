import pg from 'pg'
import { resolve } from 'node:path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), 'apps/api/.env') })
config()

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://mosimi:mosimi@localhost:5432/mosimi'

const isLocalDb =
  /localhost|127\.0\.0\.1/.test(connectionString) &&
  !/sslmode=require/i.test(connectionString)

export const pool = new pg.Pool({
  connectionString,
  // Neon 등 관리형 PG는 SSL 필요
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const result = await pool.query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const rows = await query<T>(text, params)
  return rows[0]
}

export async function execute(text: string, params: unknown[] = []) {
  const result = await pool.query(text, params)
  return result.rowCount ?? 0
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const value = await fn(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('customer','manager','admin')),
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS manager_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      rating DOUBLE PRECISION NOT NULL DEFAULT 5.0,
      reviews INTEGER NOT NULL DEFAULT 0,
      experience_years INTEGER NOT NULL DEFAULT 0,
      specialties_json TEXT NOT NULL DEFAULT '[]',
      bio TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#1A7A72',
      online BOOLEAN NOT NULL DEFAULT TRUE,
      base_lat DOUBLE PRECISION,
      base_lng DOUBLE PRECISION,
      region TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('companion','care')),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      unit TEXT NOT NULL,
      duration_hint TEXT NOT NULL,
      icon TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id),
      manager_id TEXT REFERENCES users(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_hours INTEGER NOT NULL,
      pickup TEXT NOT NULL,
      destination TEXT NOT NULL,
      care_target TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK(payment_status IN ('unpaid','pending','paid','refunded')),
      customer_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS booking_declines (
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      manager_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (booking_id, manager_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      order_id TEXT NOT NULL UNIQUE,
      payment_key TEXT,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready'
        CHECK(status IN ('ready','pending','paid','failed','cancelled','refunded')),
      provider TEXT NOT NULL DEFAULT 'toss',
      raw_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_manager ON bookings(manager_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
    CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
  `)
}
