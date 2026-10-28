const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture(initial = {}, systemDark = true) {
  const storage = new Map(Object.entries(initial)), events = {}, clicks = [], attributes = {};
  const classes = () => {
    const set = new Set();
    return { contains: name => set.has(name), toggle: (name, enabled) => enabled ? set.add(name) : set.delete(name) };
  };
  const icon = {}, button = { querySelector: () => icon, setAttribute: (key, value) => attributes[key] = value, addEventListener: (type, callback) => { if (type === 'click') clicks.push(callback); } };
  const document = { readyState: 'complete', documentElement: { classList: classes() }, body: { classList: classes() }, getElementById: () => button };
  const media = { matches: systemDark, addEventListener: (type, callback) => events.system = callback };
  const window = { addEventListener: (type, callback) => events[type] = callback, dispatchEvent() {} };
  vm.runInNewContext(fs.readFileSync('js/theme.js', 'utf8'), { document, window, matchMedia: () => media, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }, CustomEvent: class {} });
  return { document, media, events, storage, clicks, icon, attributes };
}

test('saved light theme overrides dark OS and conflicting legacy preference', () => {
  const state = fixture({ aniverse_theme: 'theme-light', darkMode: 'enabled' });
  assert.ok(state.document.documentElement.classList.contains('theme-light'));
  assert.ok(state.document.body.classList.contains('light-mode'));
  assert.equal(state.document.body.classList.contains('dark-mode'), false);
  assert.equal(state.attributes['aria-label'], 'Ativar modo escuro');
});

test('one click changes the theme once and persists the same state for both storage keys', () => {
  const state = fixture({ aniverse_theme: 'theme-light' });
  assert.equal(state.clicks.length, 1);
  state.clicks[0]();
  assert.ok(state.document.documentElement.classList.contains('theme-dark'));
  assert.ok(state.document.body.classList.contains('dark-mode'));
  assert.equal(state.document.body.classList.contains('light-mode'), false);
  assert.equal(state.storage.get('aniverse_theme'), 'theme-dark');
  assert.equal(state.storage.get('darkMode'), 'enabled');
  state.clicks[0]();
  assert.equal(state.storage.get('aniverse_theme'), 'theme-light');
  assert.equal(state.storage.get('darkMode'), 'disabled');
});

test('system changes apply only until the user chooses a theme', () => {
  const state = fixture({}, true);
  state.media.matches = false; state.events.system();
  assert.ok(state.document.body.classList.contains('light-mode'));
  state.clicks[0]();
  state.events.system();
  assert.ok(state.document.body.classList.contains('dark-mode'));
});
