(function (root) {
  'use strict';
  const clamp = n => Math.max(0, Math.min(100, Number.isFinite(Number(n)) ? Number(n) : 50));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const FINISHES = { common: 'Fosca', rare: 'Brilhante', epic: 'Holográfica', legendary: 'Metal dourado' };
  const COLORS = { common: '#b6c5b0', rare: '#80cae8', epic: '#c5a3f3', legendary: '#e9c775' };

  function sanitizeConfig(input) {
    if (input?.version !== 1 || !input.seasons || typeof input.seasons !== 'object') return { version: 1, seasons: {} };
    const result = { version: 1, seasons: {} };
    for (const [season, entries] of Object.entries(input.seasons)) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(season) || !entries || typeof entries !== 'object') continue;
      result.seasons[season] = {};
      for (const [id, entry] of Object.entries(entries)) {
        if (!/^[0-2]-[0-7]$/.test(id) || !entry || typeof entry !== 'object') continue;
        let src = String(entry.src || '').trim();
        if (src.length > 1500000 || (src && !/^(https?:\/\/|data:image\/(png|jpeg|webp|gif|avif);base64,|\.?\/?[a-zA-Z0-9_/-]+\.)/i.test(src))) src = '';
        result.seasons[season][id] = { src, name: String(entry.name || '').slice(0, 70), x: clamp(entry.x ?? 50), y: clamp(entry.y ?? 50) };
      }
    }
    return result;
  }

  function drawRender(ctx, image, x, y, size, positionX = 50, positionY = 50) {
    const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    const scale = size / Math.max(width, height), renderedWidth = width * scale, renderedHeight = height * scale;
    ctx.drawImage(image, x + (size - renderedWidth) * positionX / 100, y + (size - renderedHeight) * positionY / 100, renderedWidth, renderedHeight);
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { sanitizeConfig, FINISHES, drawRender }; return; }

  const $ = id => document.getElementById(id);
  let published = { version: 1, seasons: {} };
  let loadPromise, exportBook, generation = null, gifUrl = null;
  function entryFor(key, id) { return published.seasons[key]?.[id] || {}; }
  function decorate(card, key) {
    const entry = entryFor(key, card.id);
    return { ...card, name: entry.name || card.name, image: entry.src || card.renderSrc || '', imageX: entry.x ?? 50, imageY: entry.y ?? 50, finish: FINISHES[card.rarity] };
  }
  function notify() { root.dispatchEvent(new CustomEvent('card-art:updated')); }
  function load() {
    if (!loadPromise) loadPromise = fetch('card-art.json').then(res => { if (!res.ok) throw new Error('manifest'); return res.json(); })
      .then(config => { published = sanitizeConfig(config); notify(); }).catch(() => {});
    return loadPromise;
  }
  function photo(card) {
    return `<div class="card-photo ${card.image ? 'has-photo' : ''}" style="--photo-x:${card.imageX}%;--photo-y:${card.imageY}%"><span class="card-photo-fallback"><span>▧</span><small>${card.image ? 'Carregando imagem…' : 'Personagem'}</small></span>${card.image ? `<img src="${esc(card.image)}" alt="${esc(card.name)}" loading="lazy" decoding="async" data-no-retry="true">` : ''}</div>`;
  }
  function mount() {
    if ($('card-export-dialog')) return;
    const host = document.createElement('div');
    host.innerHTML = `<dialog id="card-export-dialog" class="card-studio-dialog" aria-labelledby="card-export-title"><button type="button" class="hub-icon-button studio-close" data-studio-close aria-label="Fechar exportação">✕</button><span class="hub-eyebrow">SUA COLEÇÃO EM MOVIMENTO</span><h2 id="card-export-title">Um GIF para guardar.</h2><p>Escolha até 6 cartas adquiridas deste álbum. O GIF mostra cada uma girando em perspectiva, com o acabamento da raridade.</p><div id="card-export-options" class="card-export-options"></div><div class="studio-actions"><button type="button" id="card-export-start" class="hub-button">Gerar GIF 3D</button><button type="button" id="card-export-cancel" class="hub-button secondary" hidden>Cancelar</button></div><p id="card-export-status" role="status" aria-live="polite"></p><progress id="card-export-progress" max="100" value="0" hidden aria-label="Progresso da exportação"></progress><div id="card-export-result"></div></dialog>`;
    document.body.appendChild(host);
    host.querySelectorAll('[data-studio-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    $('card-export-start').addEventListener('click', exportGif);
    $('card-export-cancel').addEventListener('click', () => { if (generation) generation.cancelled = true; });
    $('card-export-dialog').addEventListener('close', () => {
      if (generation) generation.cancelled = true;
      if (gifUrl) { URL.revokeObjectURL(gifUrl); gifUrl = null; }
      $('card-export-result').replaceChildren();
      document.querySelector('[data-action="export-gif"]')?.focus();
    });
    root.addEventListener('aniverse:profile-changed', () => { $('card-export-dialog').close(); });
  }
  function loadImage(src, revoke = false) {
    return new Promise((resolve, reject) => {
      const image = new Image(), timer = setTimeout(() => finish(new Error('A imagem demorou para carregar.')), 10000);
      const finish = error => { clearTimeout(timer); image.onload = image.onerror = null; if (revoke) URL.revokeObjectURL(src); error ? reject(error) : resolve(image); };
      image.crossOrigin = 'anonymous'; image.onload = () => finish(); image.onerror = () => finish(new Error('Esta imagem não permite exportação. Use uma imagem do próprio site.')); image.src = src;
    });
  }
  function openExport(collection, id) {
    mount(); exportBook = collection;
    const owned = collection.cards.filter(c => c.owned);
    $('card-export-options').innerHTML = owned.map((card, i) => `<label><input type="checkbox" value="${card.id}" ${(id ? card.id === id : i < 3) ? 'checked' : ''}><span><strong>${esc(decorate(card, collection.key).name)}</strong><small>${root.collectionRarities[card.rarity].name} · ${FINISHES[card.rarity]}</small></span></label>`).join('') || '<p>Ganhe seu primeiro pacote para exportar suas cartas.</p>';
    $('card-export-start').disabled = !owned.length; $('card-export-status').textContent = 'GIF de 420 × 500 pixels. As cartas originais continuam no álbum.';
    $('card-export-progress').hidden = true; $('card-export-cancel').hidden = true;
    $('card-export-result').replaceChildren(); $('card-export-dialog').showModal();
  }
  function drawFace(card, image) {
    const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 420;
    const ctx = canvas.getContext('2d'), color = COLORS[card.rarity];
    const bg = ctx.createLinearGradient(0, 0, 300, 420); bg.addColorStop(0, '#30433f'); bg.addColorStop(1, '#142522'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 300, 420);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 296, 416); ctx.globalAlpha = .4; ctx.strokeRect(8, 8, 284, 404); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.font = '10px Arial'; ctx.fillText(`ANV / ${String(card.number).padStart(2, '0')}`, 18, 28);
    if (image) drawRender(ctx, image, 18, 44, 264, card.imageX, card.imageY);
    else { ctx.fillStyle = '#3a514a'; ctx.fillRect(18, 44, 264, 264); ctx.fillStyle = '#c6d2c5'; ctx.textAlign = 'center'; ctx.font = '15px Arial'; ctx.fillText('Render do personagem', 150, 180); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#f4f0df'; ctx.font = '20px Georgia';
    const words = card.name.split(' '); let line = '', lines = [];
    words.forEach(word => { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > 260 && line) { lines.push(line); line = word; } else line = next; }); lines.push(line);
    lines.slice(0, 2).forEach((text, i) => ctx.fillText(text, 150, 338 + i * 24));
    ctx.fillStyle = color; ctx.font = '10px Arial'; ctx.fillText(`${root.collectionRarities[card.rarity].name.toUpperCase()} · ${FINISHES[card.rarity].toUpperCase()}`, 150, 393);
    return canvas;
  }
  // Inverse projective sampling keeps the entire image on one continuous plane,
  // avoiding seams and distortions at strip or triangle boundaries.
  function drawProjected(ctx, face, phase, rarity) {
    const angle = Math.sin(phase * Math.PI * 2) * .52, nod = Math.cos(phase * Math.PI * 2) * .10;
    const zoom = .85 + Math.sin(phase * Math.PI) * .05, w = face.width, h = face.height;
    const point = (x, y) => {
      const px = (x - w / 2) * Math.cos(angle), depth = -(x - w / 2) * Math.sin(angle);
      const py = (y - h / 2) * Math.cos(nod) - depth * Math.sin(nod), z = (y - h / 2) * Math.sin(nod) + depth * Math.cos(nod);
      const scale = 700 / (700 + z) * zoom; return [210 + px * scale, 246 + py * scale];
    };
    const corners = [point(0, 0), point(w, 0), point(w, h), point(0, h)];
    ctx.save(); ctx.beginPath(); corners.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.shadowColor = '#0009'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 12; ctx.fillStyle = COLORS[rarity]; ctx.fill(); ctx.restore();
    const [p0, p1, p2, p3] = corners;
    const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0];
    const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1];
    const determinant = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / determinant, j = (dx1 * dy3 - dx3 * dy1) / determinant;
    const a = p1[0] - p0[0] + g * p1[0], b = p3[0] - p0[0] + j * p3[0], c = p0[0];
    const d = p1[1] - p0[1] + g * p1[1], e = p3[1] - p0[1] + j * p3[1], f = p0[1];
    const inverse = [e - f * j, c * j - b, b * f - c * e, f * g - d, a - c * g, c * d - a * f, d * j - e * g, b * g - a * j, a * e - b * d];
    const left = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0])))), top = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
    const width = Math.min(420 - left, Math.ceil(Math.max(...corners.map(p => p[0]))) - left + 1);
    const height = Math.min(500 - top, Math.ceil(Math.max(...corners.map(p => p[1]))) - top + 1);
    if (!face.cardPixels) face.cardPixels = face.getContext('2d').getImageData(0, 0, w, h).data;
    const source = face.cardPixels, raster = document.createElement('canvas'); raster.width = width; raster.height = height;
    const painter = raster.getContext('2d'), pixels = painter.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const px = left + x + .5, py = top + y + .5, z = inverse[6] * px + inverse[7] * py + inverse[8];
      const u = (inverse[0] * px + inverse[1] * py + inverse[2]) / z, v = (inverse[3] * px + inverse[4] * py + inverse[5]) / z;
      if (u < 0 || v < 0 || u > 1 || v > 1) continue;
      const sx = u * (w - 1), sy = v * (h - 1), x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = sx - x0, fy = sy - y0, at = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const upper = source[(y0 * w + x0) * 4 + channel] * (1 - fx) + source[(y0 * w + x1) * 4 + channel] * fx;
        const lower = source[(y1 * w + x0) * 4 + channel] * (1 - fx) + source[(y1 * w + x1) * 4 + channel] * fx;
        pixels.data[at + channel] = upper * (1 - fy) + lower * fy;
      }
      pixels.data[at + 3] = 255;
    }
    painter.putImageData(pixels, 0, 0); ctx.drawImage(raster, left, top);
    if (rarity !== 'common') {
      ctx.save(); ctx.beginPath(); corners.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
      const center = 70 + phase * 320, light = ctx.createLinearGradient(center - 100, 0, center + 100, 500);
      light.addColorStop(0, '#ffffff00'); light.addColorStop(.43, rarity === 'epic' ? '#7fdfff33' : rarity === 'legendary' ? '#f9d98533' : '#ffffff18'); light.addColorStop(.5, '#ffffff70'); light.addColorStop(.57, rarity === 'epic' ? '#e399ff44' : '#ffffff18'); light.addColorStop(1, '#ffffff00'); ctx.fillStyle = light; ctx.fillRect(0, 0, 420, 500); ctx.restore();
    }
  }
  async function exportGif() {
    const selected = [...$('card-export-options').querySelectorAll('input:checked')].map(input => input.value);
    if (!selected.length || selected.length > 6) { $('card-export-status').textContent = 'Escolha de 1 a 6 cartas para o GIF.'; return; }
    if (generation) return;
    const job = { cancelled: false, profileId: exportBook.profileId }; generation = job;
    $('card-export-start').disabled = true; $('card-export-cancel').hidden = false; $('card-export-progress').hidden = false;
    if (gifUrl) URL.revokeObjectURL(gifUrl); gifUrl = null; $('card-export-result').replaceChildren();
    try {
      const cards = selected.map(id => decorate(exportBook.cards.find(card => card.id === id && card.owned), exportBook.key));
      const faces = [];
      for (const card of cards) {
        if (job.cancelled || root.collectionEngine.profileId() !== job.profileId) throw new Error('Exportação cancelada.');
        $('card-export-status').textContent = `Preparando ${card.name}…`;
        let image = null;
        try { image = card.image ? await loadImage(card.image) : null; }
        catch (error) { if (card.image !== card.renderSrc) throw error; }
        faces.push(drawFace(card, image));
      }
      const sample = document.createElement('canvas'); sample.width = 420; sample.height = 210;
      const sampler = sample.getContext('2d'), sampleBg = sampler.createLinearGradient(0, 0, 420, 210);
      sampleBg.addColorStop(0, '#30483f'); sampleBg.addColorStop(1, '#0a1211'); sampler.fillStyle = sampleBg; sampler.fillRect(0, 0, 420, 210);
      faces.forEach((face, i) => sampler.drawImage(face, i * 420 / faces.length, 0, 420 / faces.length, Math.min(155, 420 / faces.length * 1.4)));
      const palette = root.CardGifEncoder.paletteFromRgba(sampler.getImageData(0, 0, 420, 210).data);
      const encoder = new root.CardGifEncoder(420, 500, { palette }), canvas = document.createElement('canvas'); canvas.width = 420; canvas.height = 500;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      for (let n = 0; n < cards.length; n++) {
        const card = cards[n], face = faces[n];
        for (let frame = 0; frame < 24; frame++) {
          if (job.cancelled || root.collectionEngine.profileId() !== job.profileId) throw new Error('Exportação cancelada.');
          const bg = ctx.createRadialGradient(210, 230, 10, 210, 230, 350); bg.addColorStop(0, '#30483f'); bg.addColorStop(1, '#0a1211'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 420, 500);
          ctx.fillStyle = '#c2d7c7'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.fillText(`ANIVERSE COLLECTION · ${exportBook.key}`, 210, 29);
          drawProjected(ctx, face, frame / 24, card.rarity);
          ctx.fillStyle = '#b6cbbd'; ctx.font = '10px Arial'; ctx.fillText(`${n + 1} / ${cards.length} · ${exportBook.name}`, 210, 476);
          encoder.addFrame(ctx.getImageData(0, 0, 420, 500).data, 8);
          const percent = Math.round((n * 24 + frame + 1) / (cards.length * 24) * 100); $('card-export-progress').value = percent; $('card-export-status').textContent = `Criando animação… ${percent}%`;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      if (job.cancelled || root.collectionEngine.profileId() !== job.profileId) throw new Error('Exportação cancelada.');
      const blob = encoder.finish(); gifUrl = URL.createObjectURL(blob);
      $('card-export-result').innerHTML = `<img src="${gifUrl}" alt="Prévia animada das cartas selecionadas" data-no-retry="true"><a class="hub-button" href="${gifUrl}" download="aniverse-${exportBook.key}.gif">Baixar GIF · ${(blob.size / 1024 / 1024).toFixed(1)} MB</a>`;
      $('card-export-status').textContent = 'Seu GIF está pronto. Use “Baixar GIF” para salvar e compartilhar.';
    } catch (error) { $('card-export-status').textContent = error.message || 'Não foi possível gerar o GIF.'; }
    finally { generation = null; $('card-export-start').disabled = false; $('card-export-cancel').hidden = true; }
  }

  let tiltFrame = 0, activeCard = null;
  const hover = matchMedia('(hover: hover) and (pointer: fine)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function resetTilt() {
    if (!activeCard) return;
    activeCard.style.removeProperty('--tilt-x'); activeCard.style.removeProperty('--tilt-y'); activeCard.classList.remove('is-tilting'); activeCard = null;
    cancelAnimationFrame(tiltFrame);
  }
  document.addEventListener('pointermove', event => {
    const card = event.target.closest('[data-card-tilt]');
    if (!card || !hover.matches || reduced.matches || document.body.classList.contains('performance-mode')) { resetTilt(); return; }
    if (activeCard !== card) { resetTilt(); activeCard = card; }
    const rect = card.closest('.hub-sticker-slot, .hub-reveal-card, .card-editor-preview')?.getBoundingClientRect() || card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    cancelAnimationFrame(tiltFrame); tiltFrame = requestAnimationFrame(() => {
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 22}deg`); card.style.setProperty('--tilt-y', `${(x - .5) * 28}deg`);
      card.style.setProperty('--shine-x', `${x * 100}%`); card.style.setProperty('--shine-y', `${y * 100}%`); card.classList.add('is-tilting');
    });
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (activeCard && !activeCard.contains(event.relatedTarget)) resetTilt(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetTilt(); });
  reduced.addEventListener('change', resetTilt);
  document.addEventListener('load', event => { if (event.target.matches?.('.card-photo img')) event.target.parentElement.classList.add('is-ready'); }, true);
  document.addEventListener('error', event => {
    if (!event.target.matches?.('.card-photo img')) return;
    const holder = event.target.parentElement; holder.classList.add('is-error'); holder.querySelector('small').textContent = 'Imagem em breve';
  }, true);
  root.cardStudio = { load, decorate, photo, openExport, FINISHES };
})(typeof window !== 'undefined' ? window : globalThis);
