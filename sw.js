const STATIC_CACHE = 'aniverse-static-v3';
const RUNTIME_CACHE = 'aniverse-runtime-v3';

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
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function shouldNetworkFirst(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return /\.(html|css|js|json)$/.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/index.html');
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('./index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (shouldNetworkFirst(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});
