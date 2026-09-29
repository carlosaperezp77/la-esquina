// Al tocar una notificación de comanda nueva, abre la app (o la trae al frente).
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (ventanas.length) return ventanas[0].focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})
