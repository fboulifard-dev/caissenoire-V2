self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { body: event.data.text() } };
  }

  const notification = payload.notification || {};
  if (!notification.title && !notification.body) return;

  event.waitUntil(self.registration.showNotification(notification.title || 'Caisse Noire', {
    body: notification.body || '',
    icon: notification.icon,
    data: payload.data || {}
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const client = clients.find(windowClient => 'focus' in windowClient);
    return client ? client.focus() : self.clients.openWindow('/');
  }));
});