const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CollectionEngine, catalog, legacyDropRates } = require('../js/collection-engine.js');

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
  assert.equal(f.engine.snapshot().id, 'family');
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
  assert.equal(catalog('2026-12').cards[0].renderSrc, 'images/cards/Familia/1.png');
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


test('December family edition keeps the November catalog and other monthly themes intact', () => {
  const november = catalog('2026-11');
  const december = catalog('2026-12');
  assert.equal(december.id, 'family');
  assert.equal(december.cards.length, 24);
  assert.equal(new Set(december.cards.map(card => card.id)).size, 24);
  assert.ok(december.cards.every(card => card.renderSrc.startsWith('images/cards/Familia/')));
  assert.deepEqual(december.groups.map(group => group[0]), ['Em casa', 'Irmãos', 'Laços']);
  assert.deepEqual(catalog('2026-11'), november);
  assert.equal(catalog('2027-12').id, 'cosmos');
});

test('opening the family season preserves saved pirate cards, rewards, points and fragments', () => {
  const { engine, storage, nextMonth } = fixture();
  episodes(engine, 6);
  engine.openPack('2026-11');
  engine.pasteCard('2026-11', '0-0');
  const before = engine.read();
  const stored = storage.getItem('aniverse:collection:v1:alice');
  nextMonth();
  assert.equal(engine.snapshot().id, 'family');
  assert.equal(storage.getItem('aniverse:collection:v1:alice'), stored, 'viewing metadata does not rewrite the collection');
  episodes(engine, 3, 10);
  engine.openPack('2026-12');
  const after = engine.read();
  assert.deepEqual(after.albums['2026-11'], before.albums['2026-11']);
  assert.ok(after.fragments >= before.fragments);
  assert.equal(after.version, 1);
  assert.ok(after.episodes.includes(before.episodes[0]));
});


test('legacy chances follow the monthly weights, scale above 100 and expire after month 12', () => {
  assert.deepEqual(legacyDropRates('2026-11'), []);
  assert.deepEqual(legacyDropRates('2026-12'), [{key:'2026-11',monthsAgo:1,chance:.40}]);
  assert.deepEqual(legacyDropRates('2027-01').map(rate=>rate.chance), [.40,.35]);
  assert.deepEqual(legacyDropRates('2027-02').map(rate=>rate.chance), [40/105,35/105,30/105]);
  const weights = [40,35,30,25,20,15,10,8,6,4,2,1];
  const rates = legacyDropRates('2027-11');
  assert.deepEqual(rates.map(rate=>rate.chance), weights.map(weight=>weight/196));
  assert.equal(rates.at(-1).key, '2026-11');
  assert.equal(legacyDropRates('2027-12').at(-1).key, '2026-12');
});

test('only one slot can draw from the past and the rare guarantee remains in the current season', () => {
  for (const [month,roll,expected] of [[2,.05,'2027-02'],[2,.40,'2027-01'],[2,.70,'2026-12'],[2,.90,'2026-11'],[0,.90,'2027-01']]) {
    const {engine}=fixture(); engine.now=()=>new Date(2027,month,2);
    const values=[roll,0,0,0,0,0,0];engine.random=()=>values.shift()??0;
    episodes(engine,3);
    const pack=engine.openPack();
    assert.equal(pack[0].season,expected);
    const current = engine.snapshot().key;
    assert.equal(pack[0].legacy,expected!==current);
    assert.ok(pack.slice(1).every(card=>card.season===current));
    assert.notEqual(pack[2].rarity,'common');
    assert.equal(pack.length,3);
    assert.equal(engine.snapshot().packs,0);
  }
});

test('duplicate detection, fragments and pasting use the card origin rather than matching IDs in another album', () => {
  const {engine,storage,nextMonth}=fixture();nextMonth();
  const state=engine.read(),current=engine.album(state,'2026-12');current.points=600;current.owned=['0-0','0-2'];
  storage.setItem('aniverse:collection:v1:alice',JSON.stringify(state));
  const pack=engine.openPack();
  assert.equal(pack[0].season,'2026-11');assert.equal(pack[0].id,'0-0');assert.equal(pack[0].duplicate,false);
  assert.equal(pack[1].season,'2026-12');assert.equal(pack[1].duplicate,true);
  assert.equal(engine.snapshot().fragments,30);
  assert.equal(engine.pasteCard(pack[0].season,pack[0].id),true);
  assert.deepEqual(engine.snapshot('2026-11').pasted,['0-0']);
  assert.deepEqual(engine.snapshot('2026-12').pasted,[]);
  assert.equal(engine.snapshot('2026-11').packs,0);
  assert.equal(engine.snapshot('2026-12').packs,1);
  assert.equal(engine.openPack()[0].duplicate,true);
  assert.equal(engine.snapshot().fragments,70);
  const restored=new CollectionEngine({storage,now:()=>new Date(2026,11,2)});restored.profileId=()=> 'alice';
  assert.ok(restored.snapshot('2026-11').owned.includes('0-0'));
  assert.deepEqual(restored.snapshot('2026-11').pasted,['0-0']);
  assert.equal(restored.snapshot(undefined,'bob').fragments,0);
});

test('saved packs from an expired season remain exclusively from their original album', () => {
  const {engine,nextMonth}=fixture();episodes(engine,3);nextMonth();
  const pack=engine.openPack('2026-11');
  assert.ok(pack.every(card=>card.season==='2026-11'&&!card.legacy));
  assert.equal(engine.snapshot('2026-11').packs,0);
  assert.equal(engine.snapshot('2026-12').owned.length,0);
});

test('a failed mixed-pack save does not lose a pack or persist old cards halfway', () => {
  const {engine,storage,nextMonth}=fixture();nextMonth();episodes(engine,3);
  const before=storage.getItem('aniverse:collection:v1:alice');
  storage.setItem=()=>{throw new Error('storage full');};
  assert.throws(()=>engine.openPack(),/storage full/);
  assert.equal(storage.getItem('aniverse:collection:v1:alice'),before);
  assert.equal(engine.snapshot().packs,1);
  assert.equal(engine.snapshot('2026-11').owned.length,0);
});
