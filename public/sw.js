// ---- funcionamiento sin señal: guarda pantallas y archivos para abrirlos sin conexión ----
const PAGES = 'cf-pages-v1';
const STATIC = 'cf-static-v1';
const SLOW_MS = 3500;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(['/offline.html', '/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC];
      for (const key of await caches.keys()) {
        if (key.startsWith('cf-') && !keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

function cacheable(res, url) {
  if (!res || res.status !== 200 || res.redirected || res.type !== 'basic') return false;
  const path = new URL(url).pathname;
  if (path.startsWith('/login') || path.startsWith('/signup')) return false;
  return (res.headers.get('content-type') || '').includes('text/html');
}

const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

async function offlinePage() {
  return (await caches.match('/offline.html')) || new Response('Sin conexión', { status: 503 });
}

async function handleNavigate(event) {
  const req = event.request;
  const cache = await caches.open(PAGES);
  const path = new URL(req.url).pathname;
  const cached =
    (await cache.match(req.url, { ignoreVary: true })) ||
    (path === '/' ? await cache.match('/dashboard', { ignoreVary: true }) : undefined);

  const network = fetch(req).then((res) => {
    if (cacheable(res, req.url)) event.waitUntil(cache.put(req.url, res.clone()).catch(() => {}));
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  if (!cached) return network.catch(offlinePage);
  // con señal débil se muestra lo guardado en vez de dejar la pantalla en blanco
  return Promise.race([network.catch(() => cached), wait(SLOW_MS, cached)]);
}

async function handleWarm(event) {
  const req = event.request;
  const res = await fetch(req);
  if (cacheable(res, req.url)) {
    const cache = await caches.open(PAGES);
    await cache.put(req.url, res.clone());
  }
  return res;
}

async function cacheFirst(event) {
  const req = event.request;
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) event.waitUntil(cache.put(req, res.clone()).catch(() => {}));
  return res;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(event.request);
  const network = fetch(event.request)
    .then((res) => {
      if (res.ok) event.waitUntil(cache.put(event.request, res.clone()).catch(() => {}));
      return res;
    })
    .catch(() => hit);
  event.waitUntil(network.catch(() => {}));
  return hit || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  if (req.headers.get('x-cf-warm')) {
    event.respondWith(handleWarm(event));
  } else if (req.mode === 'navigate') {
    event.respondWith(handleNavigate(event));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(event));
  } else if (/\.(?:png|svg|ico|jpg|jpeg|webp|json)$/.test(url.pathname) && !req.headers.get('rsc')) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

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
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(caches.delete(PAGES));
  }
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
