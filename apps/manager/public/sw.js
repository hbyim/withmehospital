// Web Push service worker
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
      icon: './favicon.svg',
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
