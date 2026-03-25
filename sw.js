const STATIC_CACHE = 'aniverse-static-v13';
const RUNTIME_CACHE = 'aniverse-runtime-v13';
const MEDIA_CACHE = 'aniverse-media-v1';
const STREAM_PROXY_PATH = '/__anv_stream_proxy__';

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
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => ![STATIC_CACHE, RUNTIME_CACHE, MEDIA_CACHE].includes(k))
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

function isMediaRequest(request) {
  const url = new URL(request.url);

  if (request.headers.has('range')) return true;
  if (request.destination === 'video' || request.destination === 'audio') return true;
  if (url.searchParams.get('anv_sw_bypass') === '1') return true;

  const mediaPattern = /\.(mp4|m4v|webm|mov|m3u8|mpd|mp3|m4a|aac|wav|ogg)(\?|$)/i;
  const isMediaFile = mediaPattern.test(url.pathname + url.search);
  if (isMediaFile) return true;

  // Some apps proxy catbox/bitchute URLs as query params in same-origin endpoints.
  const full = (url.pathname + url.search).toLowerCase();
  if (full.includes('catbox.moe') || full.includes('bitchute.com')) return true;

  return false;
}

async function mediaCacheFirst(request) {
  if (request.headers.has('range')) return fetch(request);
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request, { cache: 'no-store' });
  if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin && url.pathname === STREAM_PROXY_PATH) {
    console.log('SW Proxy: Interceptando URL...', url.toString());
    event.respondWith(handleStreamProxy(event.request));
    return;
  }

  // Never intercept cross-origin requests (e.g. Catbox media).
  if (url.origin !== self.location.origin) return;

  if (isMediaRequest(event.request)) {
    event.respondWith(mediaCacheFirst(event.request));
    return;
  }

  if (shouldNetworkFirst(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function handleStreamProxy(request) {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('url') || '';

  if (!target) {
    return new Response('Missing stream target URL.', { status: 400 });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch (_) {
    return new Response('Invalid stream target URL.', { status: 400 });
  }

  if (!/^https?:$/.test(parsedTarget.protocol)) {
    return new Response('Unsupported stream protocol.', { status: 400 });
  }

  const forwardHeaders = new Headers();
  const incomingRange = request.headers.get('range');
  if (incomingRange) forwardHeaders.set('range', incomingRange);

  try {
    const corsResp = await fetch(parsedTarget.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: forwardHeaders
    });

    if (corsResp.type === 'opaque') {
      return corsResp;
    }

    const outHeaders = new Headers(corsResp.headers);
    if (!outHeaders.get('content-type')) outHeaders.set('content-type', 'video/mp4');
    if (!outHeaders.get('accept-ranges')) outHeaders.set('accept-ranges', 'bytes');
    outHeaders.set('cache-control', 'no-store');
    outHeaders.set('x-anv-stream-proxy', '1');

    const status = incomingRange ? 206 : (corsResp.status >= 200 && corsResp.status < 300 ? 206 : corsResp.status);
    return new Response(corsResp.body, { status, headers: outHeaders });
  } catch (_) {
    // Best-effort fallback for hosts that only allow no-cors fetch.
    // Opaque responses cannot be re-headered/re-framed by a Service Worker.
    try {
      const opaqueResp = await fetch(parsedTarget.toString(), {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit'
      });
      return opaqueResp;
    } catch (error) {
      return new Response(`Stream proxy failed: ${String(error)}`, { status: 502 });
    }
  }
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_MEDIA_CACHE_INFO') {
    event.waitUntil((async () => {
      const cache = await caches.open(MEDIA_CACHE);
      const keys = await cache.keys();
      event.ports?.[0]?.postMessage({ entries: keys.length, cache: MEDIA_CACHE });
    })());
    return;
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    event.waitUntil(self.clients.claim());
  }
});
