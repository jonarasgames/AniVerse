const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('the catalog fetches once and legacy and window callers share the same database', async () => {
  let fetches = 0, renders = 0;
  const handlers = {};
  const context = vm.createContext({
    localStorage: { getItem: () => null },
    console: { log() {}, error() {} }, Event,
    fetch: async () => { fetches++; return { ok: true, json: async () => ({ animes: [], collections: [] }) }; },
    loadNewReleases: () => renders++, loadContinueWatching() {}, loadFullCatalog() {},
    window: { addEventListener: (name, cb) => handlers[name] = cb, dispatchEvent: event => handlers[event.type]?.() }
  });
  vm.runInContext(fs.readFileSync('js/anime-db.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetches, 1);
  assert.equal(renders, 1);
  assert.equal(context.window.animeDB, vm.runInContext('animeDB', context));
});

function worker(cached, network, shellCached) {
  const handlers = {};
  const puts = [];
  const requests = [];
  const cache = { match: async () => cached, put: async (...args) => puts.push(args) };
  const context = vm.createContext({
    self: { location: { origin: 'https://aniverse.test' }, addEventListener: (name, cb) => handlers[name] = cb },
    caches: { open: async () => cache, match: async () => shellCached }, Request, Response, Headers, URL,
    fetch: req => { requests.push(req); return network(req); }, console
  });
  vm.runInContext(fs.readFileSync('sw.js', 'utf8'), context);
  return { context, handlers, requests, puts };
}

test('cached images display without waiting for a slow network refresh', async () => {
  const image = new Response('cached', { headers: { 'content-type': 'image/png' } });
  let finish;
  const w = worker(image, () => new Promise(resolve => { finish = resolve; }));
  const background = [];
  w.context.request = new Request('https://aniverse.test/images/cover.png');
  w.context.event = { waitUntil: task => background.push(task) };
  const result = await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(await result.text(), 'cached');
  assert.equal(w.requests[0].cache, 'default');
  finish(new Response('updated', { headers: { 'content-type': 'image/png' } }));
  await Promise.all(background);
  assert.equal(w.puts.length, 1);
});

test('external images retain no-cors mode and can reuse the HTTP cache', async () => {
  const w = worker(undefined, async () => new Response('image', { headers: { 'content-type': 'image/png' } }));
  w.context.request = new Request('https://files.catbox.moe/cover.png', { mode: 'no-cors' });
  w.context.event = { waitUntil() {} };
  await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(w.requests[0].cache, 'default');
  assert.equal(w.requests[0].mode, 'no-cors');
  assert.equal(w.requests[0].credentials, 'omit');
});

test('explicit CORS image requests for GIF exports remain readable by canvas', async () => {
  const w = worker(undefined, async () => new Response('image', { headers: { 'content-type': 'image/png' } }));
  w.context.request = new Request('https://files.catbox.moe/cover.png', { mode: 'cors' });
  w.context.event = { waitUntil() {} };
  await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(w.requests[0].mode, 'cors');
  assert.equal(w.requests[0].credentials, 'omit');
});

test('opaque external images never enter the persistent image cache', async () => {
  const w = worker(undefined, async () => ({ type: 'opaque' }));
  w.context.request = new Request('https://files.catbox.moe/cover.png');
  w.context.event = { waitUntil() {} };
  await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(w.puts.length, 0);
});

test('cached local images still display while offline', async () => {
  const w = worker(new Response('cached'), async () => { throw new Error('offline'); });
  const background = [];
  w.context.request = new Request('https://aniverse.test/images/cover.png');
  w.context.event = { waitUntil: task => background.push(task) };
  const response = await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(await response.text(), 'cached');
  await Promise.all(background);
});

test('video range requests bypass whole-file cache', async () => {
  const w = worker(undefined, async () => new Response('chunk', { status: 206 }));
  w.context.request = new Request('https://aniverse.test/episode.mp4', { headers: { range: 'bytes=0-1023' } });
  const response = await vm.runInContext('mediaCacheFirst(request)', w.context);
  assert.equal(response.status, 206);
  assert.equal(w.puts.length, 0);
});

test('branding requests show the new logo immediately instead of stale cached artwork', async () => {
  const stale = new Response('old-logo', { headers: { 'content-type': 'image/png' } });
  const w = worker(stale, async () => new Response('new-logo', { headers: { 'content-type': 'image/png' } }));
  w.context.request = new Request('https://aniverse.test/images/logo.png?v=brand');
  const tasks = []; w.context.event = { waitUntil: task => tasks.push(task) };
  const response = await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(await response.text(), 'new-logo');
  assert.equal(w.requests[0].cache, 'reload');
  await Promise.all(tasks);
  assert.equal(w.puts.length, 1);
});

test('offline branding can use the logo precached with the app shell', async () => {
  const w = worker(undefined, async () => { throw new Error('offline'); }, new Response('shell-logo'));
  w.context.request = new Request('https://aniverse.test/images/logo.png?v=brand');
  w.context.event = { waitUntil() {} };
  const response = await vm.runInContext('cachedImage(request, event)', w.context);
  assert.equal(await response.text(), 'shell-logo');
});

test('every app shell resource exists, including the current background and local font', () => {
  const w = worker(undefined, async () => new Response(''));
  const shell = vm.runInContext('APP_SHELL', w.context);
  for (const url of shell) assert.ok(fs.existsSync(url.split('?')[0]), `Missing app shell asset: ${url}`);
  assert.ok(shell.includes('./images/bg-default.png'));
  assert.ok(shell.includes('./assets/fonts/lilita-one/LilitaOne-Regular.ttf'));
});
