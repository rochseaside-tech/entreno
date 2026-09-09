// sw.js — service worker. Guarda la app entera en caché para que funcione
// sin conexión. Los datos no pasan por aquí: viven en IndexedDB.

const VERSION = 'v5';
const CACHE = `entreno-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/logica.js',
  './js/dia.js',
  './js/selector-comida.js',
  './js/ui.js',
  './js/sync.js',
  './js/vistas/hoy.js',
  './js/vistas/entreno.js',
  './js/vistas/comer.js',
  './js/vistas/cocina.js',
  './js/vistas/progreso.js',
  './js/vistas/ajustes.js',
  './icons/icono-192.png',
  './icons/icono-512.png',
  './icons/icono-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ARCHIVOS.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // La sincronización con GitHub y los enlaces externos nunca pasan por aquí.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Red primero: si hay cobertura siempre ves la última versión de la app.
  // Si no la hay, tira de la copia guardada y funciona igual.
  e.respondWith((async () => {
    try {
      const resp = await fetch(e.request);
      if (resp && resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
      }
      return resp;
    } catch {
      const guardado = await caches.match(e.request);
      if (guardado) return guardado;
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      throw new Error('sin conexión y sin copia');
    }
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'actualizar') self.skipWaiting();
});
