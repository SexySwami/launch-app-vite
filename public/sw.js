// Service worker for break alarm notifications.
// Receives SCHEDULE_ALARM / CANCEL_ALARM messages from the app,
// then fires showNotification() after the requested delay.
// This keeps the notification alive even when the browser tab is backgrounded
// or the screen is locked (reliable on Android; best-effort on iOS).

let alarmTimeout = null;

self.addEventListener('message', (event) => {
  const { type, delayMs, title, body } = event.data || {};

  if (type === 'SCHEDULE_ALARM') {
    clearTimeout(alarmTimeout);
    alarmTimeout = setTimeout(async () => {
      try {
        await self.registration.showNotification(title || 'Break is over!', {
          body: body || 'Time to get back to it.',
          vibrate: [200, 100, 200, 100, 400],
          tag: 'break-alarm',
          renotify: true,
          requireInteraction: true,
        });
      } catch {}
    }, Math.max(0, delayMs));
  }

  if (type === 'CANCEL_ALARM') {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
