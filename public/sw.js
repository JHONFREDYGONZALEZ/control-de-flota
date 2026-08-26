// ---- contador guardado para el "badge" (numerito) sobre el ícono ----
function idbGet(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open('cf-badge', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readonly');
      const getReq = tx.objectStore('kv').get(key);
      getReq.onsuccess = () => resolve(getReq.result || 0);
      getReq.onerror = () => resolve(0);
    };
    req.onerror = () => resolve(0);
  });
}
function idbSet(key, value) {
  return new Promise((resolve) => {
    const req = indexedDB.open('cf-badge', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

self.addEventListener('push', (event) => {
  let data = { title: 'Control de flota', body: 'Tienes una notificación nueva', url: '/dashboard' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // si el payload no es JSON, usamos el mensaje por defecto
  }

  event.waitUntil(
    (async () => {
      const count = (await idbGet('unread')) + 1;
      await idbSet('unread', count);
      if ('setAppBadge' in navigator) {
        try {
          await navigator.setAppBadge(count);
        } catch (e) {
          /* el celular/navegador no soporta el badge; no pasa nada */
        }
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// la app avisa aquí cuando el usuario ya entró, para poner el contador en cero
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_BADGE') {
    event.waitUntil(
      (async () => {
        await idbSet('unread', 0);
        if ('clearAppBadge' in navigator) {
          try {
            await navigator.clearAppBadge();
          } catch (e) {
            /* sin soporte, se ignora */
          }
        }
      })()
    );
  }
});
