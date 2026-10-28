const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeConfig, drawRender } = require('../js/card-studio.js');
const { CardGifEncoder } = require('../js/card-gif.js');

test('art manifests preserve separate scenes, names and crops per card and month', () => {
  const config = sanitizeConfig({ version: 1, seasons: {
    '2026-10': { '0-0': { src: 'images/cards/01.webp', name: 'Primeira cena', x: 12, y: 80 }, '0-1': { src: 'https://example.org/scene.jpg' } },
    '2026-11': { '0-0': { src: 'images/cards/another.webp' } }
  } });
  assert.equal(config.seasons['2026-10']['0-0'].x, 12);
  assert.equal(config.seasons['2026-10']['0-0'].name, 'Primeira cena');
  assert.equal(config.seasons['2026-10']['0-1'].x, 50);
  assert.equal(config.seasons['2026-11']['0-0'].src, 'images/cards/another.webp');
});

test('invalid image protocols, malformed IDs and invalid seasons cannot enter a manifest', () => {
  const config = sanitizeConfig({ version: 1, seasons: { '2026-13': { '0-0': {} }, '2026-10': {
    '0-0': { src: 'javascript:alert(1)', x: -20, y: 150 },
    '0-1': { src: 'data:image/svg+xml,<svg/>' },
    '0-2': { src: 'data:image/jpeg;base64,AABB', name: 'x'.repeat(100) },
    '0-8': { src: 'images/wrong.png' }
  } } });
  assert.equal(config.seasons['2026-13'], undefined);
  assert.equal(config.seasons['2026-10']['0-8'], undefined);
  assert.equal(config.seasons['2026-10']['0-0'].src, '');
  assert.equal(config.seasons['2026-10']['0-1'].src, '');
  assert.equal(config.seasons['2026-10']['0-0'].x, 0);
  assert.equal(config.seasons['2026-10']['0-0'].y, 100);
  assert.equal(config.seasons['2026-10']['0-2'].name.length, 70);
  assert.ok(config.seasons['2026-10']['0-2'].src.startsWith('data:image/jpeg'));
});

test('empty image configuration remains valid without inventing missing files', () => {
  assert.deepEqual(sanitizeConfig(null), { version: 1, seasons: {} });
  assert.equal(sanitizeConfig({ version: 1, seasons: { '2026-10': { '0-0': { src: '' } } } }).seasons['2026-10']['0-0'].src, '');
});

test('portrait and landscape renders fit fully without cropping the character', () => {
  const calls = [], ctx = { drawImage: (...args) => calls.push(args) };
  const portrait = { naturalWidth: 200, naturalHeight: 400 };
  drawRender(ctx, portrait, 10, 20, 300);
  assert.deepEqual(calls[0], [portrait, 85, 20, 150, 300]);
  const landscape = { naturalWidth: 400, naturalHeight: 200 };
  drawRender(ctx, landscape, 10, 20, 300);
  assert.deepEqual(calls[1], [landscape, 10, 95, 300, 150]);
});

test('GIF encoder creates a looping multi-frame GIF with valid dimensions', async () => {
  const encoder = new CardGifEncoder(100, 80);
  for (let frame = 0; frame < 3; frame++) {
    const pixels = new Uint8ClampedArray(100 * 80 * 4);
    for (let i = 0; i < pixels.length; i += 4) { pixels[i + frame] = 255; pixels[i + 3] = 255; }
    encoder.addFrame(pixels, 8);
  }
  const blob = encoder.finish(), bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(blob.type, 'image/gif');
  assert.equal(bytes.subarray(0, 6).toString(), 'GIF89a');
  assert.equal(bytes.readUInt16LE(6), 100);
  assert.equal(bytes.readUInt16LE(8), 80);
  assert.ok(bytes.includes(Buffer.from('NETSCAPE2.0')));
  assert.equal(bytes[bytes.length - 1], 59);
  assert.equal(encoder.frames, 3);
});

test('GIF encoder rejects invalid sizes and incomplete frames', () => {
  assert.throws(() => new CardGifEncoder(0, 100), /Dimensões/);
  const encoder = new CardGifEncoder(10, 10);
  assert.throws(() => encoder.addFrame(new Uint8Array(4)), /Quadro/);
  assert.throws(() => encoder.finish(), /quadro/);
});

test('adaptive GIF palettes retain subtle dark scene colors', async () => {
  const pixels = new Uint8ClampedArray([17, 29, 23, 255, 210, 160, 180, 255]);
  const palette = CardGifEncoder.paletteFromRgba(pixels);
  const colors = Array.from({ length: 256 }, (_, i) => [...palette.subarray(i * 3, i * 3 + 3)]);
  assert.ok(colors.some(color => color.join(',') === '17,29,23'));
  assert.ok(colors.some(color => color.join(',') === '210,160,180'));
  const encoder = new CardGifEncoder(2, 1, { palette }); encoder.addFrame(pixels);
  const bytes = new Uint8Array(await encoder.finish().arrayBuffer());
  assert.deepEqual(bytes.subarray(13, 781), palette);
});
