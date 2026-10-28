const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CollectionEngine, catalog } = require('../js/collection-engine.js');

function fixture(random = () => 0) {
  const data = new Map();
  let date = new Date(2026, 10, 27, 12);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const engine = new CollectionEngine({ storage, now: () => date, random });
  engine.profileId = () => 'alice';
  return { engine, storage, nextMonth: () => date = new Date(2026, 11, 1, 12) };
}
function episodes(engine, count, offset = 0) {
  for (let i = 1; i <= count; i++) engine.recordEpisode({ animeId: 1, season: 1, episode: i + offset });
}

test('only the first completion earns points; profile rewards remain separate', () => {
  const { engine } = fixture();
  episodes(engine, 3); episodes(engine, 3);
  assert.equal(engine.snapshot().points, 300);
  assert.equal(engine.snapshot().packs, 1);
  assert.equal(engine.snapshot(undefined, 'bob').points, 0);
  engine.recordEpisode({ animeId: 1, season: 1, episode: 1 }, 'bob');
  assert.equal(engine.snapshot(undefined, 'bob').points, 100);
  assert.equal(engine.snapshot().points, 300);
});

test('invalid episode events cannot earn points', () => {
  const { engine } = fixture();
  assert.equal(engine.recordEpisode({ animeId: undefined, season: 1, episode: 1 }), false);
  assert.equal(engine.recordEpisode({ animeId: 1, season: 0, episode: 1 }), false);
  assert.equal(engine.recordEpisode({ animeId: 1, season: 1, episode: 1.5 }), false);
  assert.equal(engine.snapshot().points, 0);
});

test('a pack contains three cards, guarantees rare or better, and compensates duplicates', () => {
  const { engine } = fixture();
  episodes(engine, 3);
  const pack = engine.openPack();
  assert.equal(pack.length, 3);
  assert.notEqual(pack[2].rarity, 'common');
  assert.equal(pack[1].duplicate, true);
  assert.equal(engine.snapshot().fragments, 10);
  assert.equal(engine.snapshot().owned.length, 2);
  assert.equal(engine.snapshot().packs, 0);
  assert.throws(() => engine.openPack(), /Complete mais/);
});

test('cards survive closing a pack and reloading; pasting is idempotent', () => {
  const { engine, storage } = fixture();
  episodes(engine, 3);
  const [card] = engine.openPack();
  const restored = new CollectionEngine({ storage, now: () => new Date(2026, 10, 27) });
  restored.profileId = () => 'alice';
  assert.ok(restored.snapshot().owned.includes(card.id));
  assert.equal(restored.pasteCard('2026-11', card.id), true);
  assert.equal(restored.pasteCard('2026-11', card.id), false);
  assert.equal(restored.pasteCard('2026-11', 'not-owned'), false);
  assert.equal(restored.snapshot().pasted.length, 1);
});

test('month rollover preserves old packs, changes theme and resets monthly points', () => {
  const f = fixture();
  episodes(f.engine, 4);
  assert.equal(f.engine.snapshot().id, 'pirates');
  f.nextMonth();
  assert.equal(f.engine.snapshot().id, 'cosmos');
  assert.equal(f.engine.snapshot().points, 0);
  assert.equal(f.engine.snapshot('2026-11').packs, 1);
  episodes(f.engine, 4);
  assert.equal(f.engine.snapshot().points, 0, 'replays remain ineligible in later months');
  episodes(f.engine, 1, 4);
  assert.equal(f.engine.snapshot().points, 100);
  assert.equal(f.engine.openPack('2026-11').length, 3);
  assert.ok(f.engine.snapshot().archive.includes('2026-11'));
});

test('pages, categories and album reward only pasted cards and cannot be claimed twice', () => {
  const { engine, storage } = fixture();
  const state = engine.read();
  const album = engine.album(state, '2026-11');
  album.owned = catalog('2026-11').cards.map(c => c.id);
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  assert.throws(() => engine.claimReward('2026-11', 'page-0'), /ainda/);
  catalog('2026-11').cards.slice(0, 4).forEach(c => engine.pasteCard('2026-11', c.id));
  engine.claimReward('2026-11', 'page-0');
  assert.equal(engine.snapshot().fragments, 30);
  assert.throws(() => engine.claimReward('2026-11', 'page-0'), /ainda/);
  assert.throws(() => engine.claimReward('2026-11', 'category-0'), /ainda/);
  catalog('2026-11').cards.forEach(c => engine.pasteCard('2026-11', c.id));
  engine.claimReward('2026-11', 'category-0');
  engine.claimReward('2026-11', 'album');
  engine.equipReward('2026-11', 'album');
  assert.equal(engine.snapshot().fragments, 310);
  assert.equal(engine.snapshot().equipped.id, 'album');
  assert.equal(engine.snapshot().showcase.length, 3);
});

test('crafting consumes fragments once and works with archived albums', () => {
  const { engine, storage, nextMonth } = fixture();
  const state = engine.read(); state.fragments = 60;
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  nextMonth();
  engine.craftCard('2026-11', '0-2');
  assert.equal(engine.snapshot().fragments, 0);
  assert.ok(engine.snapshot('2026-11').owned.includes('0-2'));
  assert.throws(() => engine.craftCard('2026-11', '0-2'), /já/);
  assert.throws(() => engine.craftCard('2026-11', '0-3'), /120/);
  assert.throws(() => engine.equipReward('2026-11', 'album'), /Resgate/);
});

test('storage failures do not silently consume packs', () => {
  const { engine, storage } = fixture(); episodes(engine, 3);
  const original = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => engine.openPack(), /quota/);
  storage.setItem = original;
  assert.equal(engine.snapshot().packs, 1);
  assert.equal(engine.snapshot().owned.length, 0);
});

test('every seasonal theme has 24 unique cards, six pages and all four rarities', () => {
  for (let month = 1; month <= 12; month++) {
    const book = catalog(`2027-${String(month).padStart(2, '0')}`);
    assert.equal(new Set(book.cards.map(c => c.id)).size, 24);
    assert.equal(new Set(book.cards.map(c => c.page)).size, 6);
    assert.equal(new Set(book.cards.map(c => c.rarity)).size, 4);
  }
});

test('theme render paths follow the visible card order from 1.png through 24.png', () => {
  const pirates = catalog('2026-11');
  pirates.cards.forEach((card, index) => {
    assert.equal(card.renderSrc, `images/cards/Piratas/${index + 1}.png`);
  });
  assert.equal(catalog('2026-12').cards[0].renderSrc, 'images/cards/Cosmos/1.png');
  assert.equal(catalog('2027-05').cards[0].renderSrc, 'images/cards/Piratas/1.png');
});

test('all 24 pasted cards unlock profile avatars automatically without claiming the trophy', () => {
  const { engine, storage } = fixture();
  const state = engine.read(), album = engine.album(state, '2026-11');
  album.owned = catalog('2026-11').cards.map(card => card.id);
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  assert.equal(engine.unlockedAvatars().length, 0, 'owning all cards does not complete the album');
  album.pasted = album.owned.slice(0, 23);
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  assert.equal(engine.unlockedAvatars().length, 0);
  album.pasted = [...album.owned];
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  const avatars = engine.unlockedAvatars();
  assert.equal(avatars.length, 24);
  assert.equal(avatars[0].renderSrc, 'images/cards/Piratas/1.png');
  assert.equal(avatars[23].renderSrc, 'images/cards/Piratas/24.png');
  assert.equal(engine.snapshot().claimed.includes('album'), false);
});

test('album avatar rewards persist across seasons and stay isolated by profile', () => {
  const { engine, storage, nextMonth } = fixture();
  const state = engine.read(), album = engine.album(state, '2026-11');
  album.pasted = catalog('2026-11').cards.map(card => card.id);
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  nextMonth();
  assert.equal(engine.unlockedAvatars().length, 24);
  assert.equal(engine.unlockedAvatars()[0].season, '2026-11');
  assert.equal(engine.unlockedAvatars('bob').length, 0);
  const restored = new CollectionEngine({ storage, now: () => new Date(2026, 11, 2) }); restored.profileId = () => 'alice';
  assert.equal(restored.unlockedAvatars().length, 24);
});

test('November launch blocks early rewards and activates at the first day without consuming episodes', () => {
  const { storage } = fixture();
  let date = new Date(2026, 9, 31, 23, 59, 59);
  const engine = new CollectionEngine({ storage, now: () => date });
  engine.profileId = () => 'alice';
  episodes(engine, 3);
  assert.equal(storage.getItem('aniverse:collection:v1:alice'), null);
  assert.equal(engine.snapshot().comingSoon, true);
  assert.equal(engine.snapshot().key, '2026-11');
  assert.equal(engine.snapshot().packs, 0);
  assert.deepEqual(engine.snapshot().archive, ['2026-11']);
  for (const action of [() => engine.openPack('2026-11'), () => engine.craftCard('2026-11', '0-0'), () => engine.pasteCard('2026-11', '0-0'), () => engine.claimReward('2026-11', 'album'), () => engine.equipReward('2026-11', 'album')]) assert.throws(action, /não está disponível/);
  date = new Date(2026, 10, 1, 0, 0, 0);
  assert.equal(engine.snapshot().comingSoon, false);
  assert.equal(engine.snapshot().id, 'pirates');
  episodes(engine, 3);
  assert.equal(engine.snapshot().packs, 1);
  assert.equal(engine.openPack().length, 3);
  assert.throws(() => engine.openPack('2026-12'), /não está disponível/);
});

test('prelaunch test albums stay stored but are excluded from the official archive and avatar rewards', () => {
  const { engine, storage } = fixture();
  const state = engine.read(), old = engine.album(state, '2026-10');
  old.pasted = catalog('2026-10').cards.map(card => card.id); old.points = 900;
  storage.setItem('aniverse:collection:v1:alice', JSON.stringify(state));
  assert.deepEqual(engine.snapshot().archive, ['2026-11']);
  assert.equal(engine.unlockedAvatars().length, 0);
  assert.throws(() => engine.openPack('2026-10'), /não está disponível/);
  assert.equal(engine.read().albums['2026-10'].points, 900);
});
