// =====================================================
// SERVICE WORKER — Ruta Bus SENA CTPGA Caucasia
// Desarrollada por Vibras Positivas HM
// =====================================================

const CACHE_NAME = 'ruta-bus-sena-v1';
const BASE_PATH = '/sena-ruta-bus';

// Archivos a cachear para funcionamiento offline
const ASSETS_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
];

// ─── INSTALL: guarda archivos en caché ───────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando archivos de la app');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: limpia cachés viejas ──────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Eliminando caché antigua:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: estrategia Cache First, luego red ────────
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones del mismo origen
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualizar en segundo plano (stale-while-revalidate)
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {});
        
        return cachedResponse;
      }

      // Si no está en caché, ir a la red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline: retornar index.html
        if (event.request.destination === 'document') {
          return caches.match(`${BASE_PATH}/index.html`);
        }
      });
    })
  );
});

// ─── PUSH NOTIFICATIONS (futuro) ─────────────────────
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'El bus está próximo a salir',
    icon: `${BASE_PATH}/icons/icon-192x192.png`,
    badge: `${BASE_PATH}/icons/icon-72x72.png`,
    vibrate: [200, 100, 200],
    data: { url: `${BASE_PATH}/` },
    actions: [
      { action: 'ver', title: 'Ver horarios' },
      { action: 'cerrar', title: 'Cerrar' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification('🚌 Ruta Bus SENA', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'ver' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

