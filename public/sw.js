const CACHE_NAME = 'billing-hub-shell-v5';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/assets/images/app_logo.png',
  '/assets/images/billing_hub_brand.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          response.ok &&
          // Never cache HTML navigations. OAuth callbacks must always
          // receive the current callback page/script instead of an older
          // cached login page.
          url.pathname.startsWith('/_next/static/')
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          cached => cached || caches.match('/')
        )
      )
  );
});