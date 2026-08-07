import webpush from 'web-push'
import { query, queryOne } from '../db'
import { newId } from './models'

export type PushPayload = {
  title: string
  body: string
  url?: string
  data?: Record<string, unknown>
}

/** 고객/매니저 앱 deep link (푸시 클릭용) */
export function appDeepLink(
  app: 'customer' | 'manager',
  hashPath: string,
) {
  const envKey = app === 'manager' ? 'MANAGER_APP_URL' : 'CUSTOMER_APP_URL'
  const fallback =
    app === 'manager' ? 'http://localhost:5174/' : 'http://localhost:5173/'
  const base = (process.env[envKey] || fallback).replace(/\/?$/, '/')
  const hash = hashPath.startsWith('#')
    ? hashPath
    : hashPath.startsWith('/')
      ? `#${hashPath}`
      : `#/${hashPath}`
  return `${base}${hash}`
}

function configured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  )
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || ''
}

function ensureWebPush() {
  if (!configured()) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  return true
}

export async function saveSubscription(input: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM push_subscriptions WHERE endpoint = $1',
    [input.endpoint],
  )
  if (existing) {
    await query(
      `UPDATE push_subscriptions
       SET user_id = $1, p256dh = $2, auth = $3, user_agent = $4
       WHERE id = $5`,
      [
        input.userId,
        input.p256dh,
        input.auth,
        input.userAgent ?? null,
        existing.id,
      ],
    )
    return existing.id
  }
  const id = newId('push')
  await query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      input.userId,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.userAgent ?? null,
    ],
  )
  return id
}

export async function removeSubscription(endpoint: string, userId: string) {
  await query(
    'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
    [endpoint, userId],
  )
}

export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  },
  userAgent?: string,
) {
  return saveSubscription({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent,
  })
}

export async function removePushSubscription(userId: string, endpoint: string) {
  return removeSubscription(endpoint, userId)
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureWebPush()) {
    console.log('[push:stub]', userId, payload.title, payload.body)
    return { sent: 0, mode: 'stub' as const }
  }

  const subs = await query<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
  }>('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId])

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      )
      sent += 1
    } catch (error) {
      const status =
        typeof error === 'object' && error && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 0
      if (status === 404 || status === 410) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id])
      } else {
        console.error('[push] failed', sub.endpoint, error)
      }
    }
  }
  return { sent, mode: 'webpush' as const }
}
