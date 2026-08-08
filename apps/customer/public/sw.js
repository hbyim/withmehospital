const CACHE = 'mosimi-customer-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './manifest.webmanifest'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // API·외부는 네트워크만
  if (url.pathname.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        void caches.open(CACHE).then((cache) => cache.put(request, copy))
        return res
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./'))),
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: '모시미+', body: '새 알림', url: './#/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    // ignore
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url, ...(payload.data || {}) },
      icon: './icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data?.url || './#/'
  const target = (() => {
    try {
      return new URL(raw, self.location.origin).href
    } catch {
      return raw
    }
  })()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate?.(target)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(target)
    }),
  )
})
