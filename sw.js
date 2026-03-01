const STATIC_CACHE = 'aniverse-static-v1';
const RUNTIME_CACHE = 'aniverse-runtime-v1';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './css/dark-mode.css',
  './css/hero-video-rotator.css',
  './js/script.js',
  './js/anime-db.js',
  './js/anime-renderer.js',
  './js/video-player.js',
  './js/music.js',
  './js/download-manager.js',
  './anime-data.json',
  './news-data.json',
  './images/logo.png',
  './images/bg-default.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
      .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Cross-origin media/runtime cache first (for downloaded assets)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
