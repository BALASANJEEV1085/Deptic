// Deptic Service Worker — Web Push Handler

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/badge-72.png',
    image: data.image || null,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
    },
    actions: data.actions || [],
    tag: data.tag || 'deptic-notification',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: data.timestamp || Date.now(),
  };

  // Add color tint based on notification type
  if (data.type === 'critical_cve') {
    options.requireInteraction = true;
    options.vibrate = [300, 100, 300, 100, 300];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const notificationId = event.notification.data?.notificationId;

  // Handle action buttons
  if (event.action === 'view_scan') {
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === 'view_pr') {
    event.waitUntil(clients.openWindow(event.notification.data?.prUrl));
  } else if (event.action === 'dismiss') {
    return;
  } else {
    // Default: open the notification URL
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Focus existing window if open
          for (const client of windowClients) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open new window
          return clients.openWindow(url);
        })
    );
  }

  // Mark notification as clicked via fetch
  if (notificationId) {
    fetch(`/api/notifications/${notificationId}/clicked`, { method: 'POST' });
  }
});

self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    fetch(`/api/notifications/${notificationId}/dismissed`, { method: 'POST' });
  }
});

// Background sync for offline notification delivery
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Re-fetch any missed notifications when back online
  const response = await fetch('/api/notifications/unread');
  const data = await response.json();
  // Show any missed notifications
  for (const notif of data.notifications || []) {
    await self.registration.showNotification(notif.title, {
      body: notif.body,
      icon: '/icon-192.png',
      data: { url: notif.url, notificationId: notif.id }
    });
  }
}
