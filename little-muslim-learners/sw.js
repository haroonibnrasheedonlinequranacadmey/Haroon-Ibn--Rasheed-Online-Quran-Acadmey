const CACHE = 'albayan-static-v13';
const CORE_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './quran-data.js',
  './quran-validation.js',
  './quran-library.js',
  './manifest.webmanifest',
  './assets/namaz-e-nabavi.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE_FILES.map(async path => {
      try {
        const response = await fetch(new Request(path, {cache: 'reload'}));
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        console.warn('[Al-Bayan] Pre-cache skipped:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => (key.startsWith('albayan-static-') || key.startsWith('lml-static-')) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isPage = request.mode === 'navigate' || /\\.(html?)$/i.test(path);
  const isCode = /\\.(js|css)$/i.test(path);
  const isPdfOrAsset = /\\.(pdf|png|jpe?g|webp|svg|woff2?)$/i.test(path);

  if (isPage || isCode) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, {cache: 'no-store'});
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (error) {
        const cached = await caches.match(request, {ignoreSearch: true});
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (await caches.match('./index.html')) || Response.error();
        }
        return Response.error();
      }
    })());
    return;
  }

  if (isPdfOrAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(request, {ignoreSearch: true});
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, fresh.clone());
          return fresh;
        }
        return cached || fresh;
      } catch (error) {
        return cached || Response.error();
      }
    })());
  }
});
