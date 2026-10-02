// FinBrain service worker.
//
// Two rules drive the strategy here:
//
// 1. The app shell must never be served stale. A cache-first HTML document
//    pins users to whatever bundle was current when they first visited, and
//    no deploy can dislodge it. Navigations therefore go to the network
//    first and only fall back to cache when offline.
//
// 2. Account data is never cached. Responses under /api/ contain the user's
//    financial records; a Cache Storage entry keyed only by URL outlives
//    sign-out and is readable by the next person to use the device. The
//    offline benefit does not justify that exposure.
//
// Bump CACHE_VERSION whenever the caching rules change; activate() removes
// every cache that does not match the current version.
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `finbrain-static-${CACHE_VERSION}`;

// Only the offline fallback shell is precached. Hashed build output is
// picked up lazily as it is requested.
const OFFLINE_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// Content-hashed build output: the filename changes whenever the bytes do,
// so serving it from cache can never go stale.
function isImmutableAsset(url) {
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch account data or cross-origin requests.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // App shell: network first so a deploy takes effect immediately, cache
  // only as an offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', cloned));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || Response.error())),
    );
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Everything else same-origin: prefer the network, fall back to cache so
  // the app still opens offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
