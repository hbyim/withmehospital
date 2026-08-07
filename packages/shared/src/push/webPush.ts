import { api, getApiBase } from '../api/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export async function getPushConfig() {
  return api<{ publicKey: string; enabled: boolean }>(
    '/api/push/vapid-public-key',
  )
}

export async function enableWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('이 브라우저는 Web Push를 지원하지 않습니다.')
  }

  const config = await getPushConfig()
  if (!config.enabled || !config.publicKey) {
    throw new Error(
      '서버에 VAPID 키가 없습니다. apps/api/.env에 VAPID_* 를 설정하세요.',
    )
  }

  const reg = await navigator.serviceWorker.register('./sw.js')
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림 권한이 거부되었습니다.')
  }

  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('구독 정보가 올바르지 않습니다.')
  }

  await api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  })

  return { ok: true as const, apiBase: getApiBase() }
}

export async function disableWebPush() {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration('./sw.js')
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  try {
    await api('/api/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    })
  } catch {
    // ignore server errors on unsubscribe
  }
  await subscription.unsubscribe()
}
