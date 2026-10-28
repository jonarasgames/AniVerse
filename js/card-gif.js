(function (root) {
  'use strict';

  // A small GIF89a encoder with adaptive or RGB332 palettes. Reset LZW before the
  // dictionary reaches 512 entries so codes stay nine bits on every decoder.
  function lzw(indices) {
    const bytes = new Uint8Array(Math.ceil(indices.length * 1.15) + 1024);
    let offset = 0, bits = 0, pending = 0, next = 258;
    const dictionary = new Map();
    const emit = code => {
      pending |= code << bits; bits += 9;
      while (bits >= 8) { bytes[offset++] = pending & 255; pending >>>= 8; bits -= 8; }
    };
    emit(256);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const suffix = indices[i], key = prefix * 256 + suffix;
      if (dictionary.has(key)) { prefix = dictionary.get(key); continue; }
      emit(prefix);
      if (next < 500) dictionary.set(key, next++);
      else { emit(256); dictionary.clear(); next = 258; }
      prefix = suffix;
    }
    emit(prefix); emit(257);
    if (bits) bytes[offset++] = pending & 255;
    return bytes.subarray(0, offset);
  }

  class CardGifEncoder {
    static paletteFromRgba(rgba) {
      const bins = new Map();
      for (let i = 0; i < rgba.length; i += 4) {
        const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], key = (r >> 3) << 10 | (g >> 3) << 5 | b >> 3;
        const bin = bins.get(key) || [0, 0, 0, 0];
        bin[0] += r; bin[1] += g; bin[2] += b; bin[3]++; bins.set(key, bin);
      }
      const colors = [...bins.values()].map(bin => [bin[0] / bin[3], bin[1] / bin[3], bin[2] / bin[3], bin[3]]);
      if (!colors.length) throw new Error('A paleta precisa de pixels.');
      const box = items => {
        const ranges = [0, 1, 2].map(c => Math.max(...items.map(v => v[c])) - Math.min(...items.map(v => v[c])));
        const axis = ranges.indexOf(Math.max(...ranges)), weight = items.reduce((n, c) => n + c[3], 0);
        return { items, axis, weight, score: items.length > 1 ? ranges[axis] * Math.sqrt(weight) : -1 };
      };
      const boxes = [box(colors)];
      while (boxes.length < 256) {
        let index = 0; boxes.forEach((candidate, i) => { if (candidate.score > boxes[index].score) index = i; });
        const selected = boxes[index]; if (selected.score < 0) break;
        selected.items.sort((a, b) => a[selected.axis] - b[selected.axis]);
        let weight = 0, split = 1;
        for (let i = 0; i < selected.items.length - 1; i++) { weight += selected.items[i][3]; split = i + 1; if (weight >= selected.weight / 2) break; }
        boxes.splice(index, 1, box(selected.items.slice(0, split)), box(selected.items.slice(split)));
      }
      const palette = new Uint8Array(768);
      boxes.forEach((entry, i) => {
        for (let c = 0; c < 3; c++) palette[i * 3 + c] = Math.round(entry.items.reduce((sum, color) => sum + color[c] * color[3], 0) / entry.weight);
      });
      for (let i = boxes.length; i < 256; i++) palette.set(palette.subarray((boxes.length - 1) * 3, boxes.length * 3), i * 3);
      return palette;
    }
    constructor(width, height, { palette: customPalette } = {}) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1024 || height > 1024) throw new Error('Dimensões de GIF inválidas.');
      this.width = width; this.height = height; this.frames = 0;
      const palette = new Uint8Array(768);
      for (let i = 0; i < 256; i++) palette.set([Math.round((i >> 5) * 255 / 7), Math.round(((i >> 2) & 7) * 255 / 7), (i & 3) * 85], i * 3);
      if (customPalette && customPalette.length !== 768) throw new Error('Paleta de GIF inválida.');
      if (customPalette) palette.set(customPalette);
      this.customPalette = customPalette ? palette : null; this.colorLookup = new Map();
      this.parts = [new Uint8Array([71, 73, 70, 56, 57, 97, width & 255, width >> 8, height & 255, height >> 8, 247, 0, 0]), palette,
        // NETSCAPE2.0 infinite loop extension.
        new Uint8Array([33, 255, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0])];
    }
    addFrame(rgba, delay = 8) {
      if (rgba.length !== this.width * this.height * 4) throw new Error('Quadro de GIF inválido.');
      const indices = new Uint8Array(this.width * this.height);
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const clamp = value => Math.max(0, Math.min(255, value));
      for (let i = 0; i < indices.length; i++) {
        if (this.customPalette) {
          const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], key = (r >> 3) << 10 | (g >> 3) << 5 | b >> 3;
          if (!this.colorLookup.has(key)) {
            let best = 0, distance = Infinity;
            for (let n = 0; n < 256; n++) {
              const dr = r - this.customPalette[n * 3], dg = g - this.customPalette[n * 3 + 1], db = b - this.customPalette[n * 3 + 2];
              const candidate = dr * dr * 2 + dg * dg * 4 + db * db;
              if (candidate < distance) { distance = candidate; best = n; }
            }
            this.colorLookup.set(key, best);
          }
          indices[i] = this.colorLookup.get(key); continue;
        }
        const dither = (bayer[((Math.floor(i / this.width) & 3) << 2) | (i & 3)] - 7.5) * 1.2;
        indices[i] = (Math.round(clamp(rgba[i * 4] + dither) * 7 / 255) << 5)
          | (Math.round(clamp(rgba[i * 4 + 1] + dither) * 7 / 255) << 2)
          | Math.round(clamp(rgba[i * 4 + 2] + dither * 2) * 3 / 255);
      }
      const compressed = lzw(indices), w = this.width, h = this.height;
      this.parts.push(new Uint8Array([33, 249, 4, 4, delay & 255, delay >> 8, 0, 0, 44, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0, 8]));
      for (let offset = 0; offset < compressed.length; offset += 255) {
        const block = compressed.subarray(offset, offset + 255);
        this.parts.push(new Uint8Array([block.length]), block);
      }
      this.parts.push(new Uint8Array([0])); this.frames++;
    }
    finish() {
      if (!this.frames) throw new Error('O GIF precisa de pelo menos um quadro.');
      return new Blob([...this.parts, new Uint8Array([59])], { type: 'image/gif' });
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { CardGifEncoder };
  else root.CardGifEncoder = CardGifEncoder;
})(typeof window !== 'undefined' ? window : globalThis);
