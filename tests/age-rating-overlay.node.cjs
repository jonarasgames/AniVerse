const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(rejectPlay = false) {
  const listeners = {};
  const timers = [];
  function target(name) {
    return { name, style: {}, hidden: false, attrs: {}, events: {},
      classList: { values: new Set(), add(...v) { v.forEach(x => this.values.add(x)); }, remove(...v) { v.forEach(x => this.values.delete(x)); }, contains(v) { return this.values.has(v); } },
      addEventListener(type, fn) { this.events[type] = fn; }, getAttribute(key) { return this.attrs[key] || null; }, pause() {}, currentTime: 0 };
  }
  const container = target('container'), overlay = target('overlay'), fallback = target('fallback'), image = target('image'), player = target('player');
  overlay.attrs.src = 'assets/webm/12/example.webm';
  overlay.play = () => rejectPlay ? Promise.reject(new Error('autoplay')) : Promise.resolve();
  image.attrs.src = 'images/12.svg'; image.src = 'http://localhost/images/12.svg';
  player.paused = false; player.ended = false; player.src = 'episode.mp4';
  const nodes = { 'video-player-container': container, 'age-rating-overlay': overlay, 'age-rating-fallback': fallback, 'age-rating-image': image };
  const document = { fullscreenElement: null, getElementById: id => nodes[id], addEventListener: (event, fn) => listeners[event] = fn };
  let observer;
  class MutationObserver { constructor(fn) { observer = fn; } observe() {} }
  const window = { currentWatchingAnime: { id: 1, season: 1, episode: 1 } };
  const setTimeout = (fn, delay) => { const timer = { fn, delay, active: true }; timers.push(timer); return timer; };
  const clearTimeout = timer => { timer.active = false; };
  const source = fs.readFileSync('js/video-player.js', 'utf8');
  const start = source.indexOf('(function initAgeRatingOverlay(){');
  const end = source.indexOf('    // Auto-hide controls in fullscreen mode', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { document, window, player, MutationObserver, setTimeout, clearTimeout });
  return { container, overlay, fallback, player, document, listeners, timers, observe: () => observer(), run(delay) { for (const t of timers.splice(0)) if (t.active && t.delay === delay) t.fn(); } };
}

test('a vinheta só começa com tela cheia e controles escondidos', () => {
  const s = setup(); s.listeners.fullscreenchange(); s.run(350);
  assert.equal(s.overlay.classList.contains('visible'), false);
  s.document.fullscreenElement = s.container; s.container.classList.add('controls-hidden'); s.observe(); s.run(350);
  assert.equal(s.overlay.classList.contains('visible'), true);
  s.container.classList.remove('controls-hidden'); s.observe();
  assert.equal(s.overlay.classList.contains('visible'), false);
});

test('falha da vinheta mostra classificação estática sem repetir tentativas', async () => {
  const s = setup(true); s.document.fullscreenElement = s.container; s.container.classList.add('controls-hidden'); s.observe(); s.run(350);
  await Promise.resolve();
  assert.equal(s.fallback.hidden, false);
  assert.match(s.fallback.src, /12\.svg$/);
  s.run(5000);
  assert.equal(s.fallback.hidden, true);
  s.observe(); s.run(350);
  assert.equal(s.overlay.classList.contains('visible'), false);
});

test('os arquivos da vinheta existem para cada classificação cadastrada', () => {
  const files = { L: 'Livre/GC Livre - superior esquerdo.webm', 10: '10/GC 10 - superior esquedo.webm', 12: '12/GC 12 - superior esquerdo.webm', 14: '14/GC 14 - superior esquerdo.webm', 16: '16/GC 16 - superior esquerdo.webm', 18: '18/GC 18 - superior esquerdo.webm' };
  for (const path of Object.values(files)) assert.ok(fs.existsSync(`assets/webm/${path}`), path);
  assert.match(fs.readFileSync('js/script.js', 'utf8'), /rating === 'L' \? 'Livre' : rating/);
});
