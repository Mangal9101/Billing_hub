const CACHE_NAME = 'billing-hub-shell-v7';

const APP_SHELL = [
  '/',
  '/favicon.ico',
  '/assets/images/app_logo.png',
  '/assets/images/billing_hub_brand.png'
];

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/assets/') ||
  url.pathname === '/favicon.ico';

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

  // Personalized/API data must always go to the network. Never cache auth,
  // billing, subscription or business data in the service worker.
  if (url.pathname.startsWith('/api/')) return;

  // Immutable Next.js/static assets: cache-first gives instant repeat loads.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML/navigation stays network-first so deployments and live business UI
  // are never trapped behind an old cached page.
  if (event.request.mode === 'navigate' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/')))
    );
  }
});
