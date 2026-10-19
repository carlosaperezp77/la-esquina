// Al tocar una notificación de comanda nueva, abre la app (o la trae al frente).
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (ventanas.length) return ventanas[0].focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})

// Aviso que manda el servidor (función avisar-comanda) aunque el teléfono esté bloqueado.
self.addEventListener('push', e => {
  let aviso = { title: 'La Esquina', body: 'Llegó una comanda', tag: 'comanda' }
  try { aviso = { ...aviso, ...e.data.json() } } catch { /* aviso sin datos */ }
  e.waitUntil(self.registration.showNotification(aviso.title, {
    body: aviso.body,
    tag: aviso.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400],
    icon: 'icono-192.png',
    badge: 'icono-192.png',
  }))
})
