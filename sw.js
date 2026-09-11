// sw.js — guarda la app en el móvil para que funcione sin cobertura en el gimnasio.
// Los datos no pasan por aquí: viven en IndexedDB.

const VERSION = 'v16';
const CACHE = `entreno-${VERSION}`;
const FOTOS = 'entreno-fotos-v1'; // aparte: no se vuelven a bajar en cada versión

const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/estado.js', './js/comunes.js', './js/descanso.js',
  './js/db.js', './js/seed.js', './js/logica.js', './js/dia.js', './js/informe.js',
  './js/vendor/preact-htm.js', './js/datos/registros.js',
  './js/datos/catalogo-ejercicios.js', './js/datos/alimentos-base.js',
  './js/pantallas/hoy.js', './js/pantallas/entreno.js', './js/pantallas/ejercicios.js',
  './js/pantallas/comida.js', './js/pantallas/progreso.js', './js/pantallas/ajustes.js',
  './icons/icono-192.png', './icons/icono-512.png', './icons/icono-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(ARCHIVOS.map((f) => c.add(f))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE && k !== FOTOS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Fotos de ejercicios: primero la copia guardada, no cambian nunca.
  if (url.pathname.includes('/img/ej/')) {
    e.respondWith((async () => {
      const guardada = await caches.match(e.request);
      if (guardada) return guardada;
      const resp = await fetch(e.request);
      if (resp.ok) (await caches.open(FOTOS)).put(e.request, resp.clone());
      return resp;
    })());
    return;
  }

  // La app: red primero, para ver siempre la última versión; sin cobertura, la copia.
  e.respondWith((async () => {
    try {
      // no-cache: pregunta siempre a GitHub si el archivo cambió (si no, responde rápido
      // con «sin cambios»). Sin esto, la caché de GitHub podía servir la versión vieja 10 minutos.
      const resp = await fetch(e.request, { cache: 'no-cache' });
      if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
      return resp;
    } catch {
      const guardado = await caches.match(e.request);
      if (guardado) return guardado;
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      throw new Error('sin conexión y sin copia');
    }
  })());
});
