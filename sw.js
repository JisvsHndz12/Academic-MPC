const CACHE_NAME = 'musikales-pro-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/variables.css',
  './css/glassmorphism.css',
  './css/layout.css',
  './css/components.css',
  './css/master.css',
  './css/docente.css',
  './css/estudiante.css',
  './js/db.js',
  './js/utils.js',
  './js/theme.js',
  './js/auth.js',
  './js/router.js',
  './js/master.js',
  './js/docente.js',
  './js/estudiante.js',
  './js/app.js',
  './assets/MusiKalesProLogoRojo.png'
];

// Instalar: cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => console.error('[SW] Error al cachear:', err))
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Eliminando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia cache-first para estáticos, network-first para dinámicos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Recursos estáticos (CSS, JS, imágenes)
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Datos dinámicos (IndexedDB se maneja en el cliente)
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});