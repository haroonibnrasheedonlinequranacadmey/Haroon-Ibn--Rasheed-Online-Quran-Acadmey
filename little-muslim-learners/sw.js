/* Al-Bayan service worker — v12
   Network-first for the app shell prevents old HTML/JS/CSS from being shown
   after a GitHub Pages deployment. Cached copies remain available offline. */
const CACHE = 'albayan-static-v12';
const APP_FILES = [
  './index.html?v=12',
  './style.css?v=12',
  './app.js?v=12',
  './quran-data.js?v=12',
  './quran-validation.js?v=12',
  './quran-library.js?v=12',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache files independently: one unavailable optional file must not block
    // installation of the updated worker.
    await Promise.allSettled(APP_FILES.map(path =>
      fetch(path, {cache: 'no-cache'}).then(response => {
        if (response.ok) return cache.put(path, response);
        throw new Error(`Precache failed: ${path} (${response.status})`);
      })
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key =>
        (key.startsWith('albayan-static-') || key.startsWith('lml-static-')) &&
        key !== CACHE
      )
      .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, {cache: 'no-cache'});
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname.toLowerCase();
  const isAppShell =
    request.mode === 'navigate' ||
    path.endsWith('.html') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.webmanifest');

  if (isAppShell) {
    event.respondWith((async () => {
      try {
        return await networkFirst(request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html?v=12');
          if (fallback) return fallback;
        }
        return new Response('Al-Bayan is temporarily unavailable offline. Please reconnect and refresh.', {
          status: 503,
          headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      }
    })());
  } else {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
  }
});
