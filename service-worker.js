/* Haroon Ibn Rasheed Online Quran Academy PWA service worker.
   Network-first behavior keeps login, schedules and account data live.
   No private portal pages or API responses are cached. */
const SW_VERSION = 'haroon-quran-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Intentionally do not cache authenticated pages or Supabase responses.
