const CACHE_NAME = 'board-game-arena-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/board-renderer.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/shared/protocol.js',
  '/shared/rng.js',
  '/shared/game-registry.js',
  '/shared/games/snakes-and-ladders.js',
  '/shared/games/ludo.js',
  '/shared/games/monopoly/index.js',
  '/shared/games/monopoly/board-data.js',
  '/shared/games/monopoly/decks.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell. WebSocket connections (gameplay) are a
// different protocol and are never intercepted here - the LAN server must
// still be reachable to actually play.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
