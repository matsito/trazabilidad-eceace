self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Pasamos la petición directa a internet para asegurar datos frescos
  e.respondWith(fetch(e.request));
});