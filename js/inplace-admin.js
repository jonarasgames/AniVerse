/* js/inplace-admin.js - in-place WYSIWYG admin editing */
(function () {
  'use strict';

  const ADMIN_PIN = 'rafaaxprs';
  const STORE_KEY = 'aniverse-admin-edits-v3';
  const ADMIN_UNLOCK_KEY = 'aniverse-admin-unlocked';

  let adminEnabled = false;
  let adminUnlocked = sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1';
  let dragAnimeId = null;

  const byId = (id) => document.getElementById(id);
  const toText = (v) => v === null || v === undefined ? '' : String(v);
  const escAttr = (v) => toText(v).replaceAll('"', '&quot;');

  function getDB() { return window.animeDB; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function timeToHMS(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }

  function parseTimeToSeconds(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    const text = String(value).trim();
    if (!text) return 0;
    if (/^\d+(\.\d+)?$/.test(text)) return Math.max(0, Math.floor(Number(text)));
    const parts = text.split(':').map((p) => Number(p.trim()));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
    if (parts.length === 3) return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (parts.length === 2) return Math.floor(parts[0] * 60 + parts[1]);
    return 0;
  }

  function parseLooseValue(raw) {
    const text = toText(raw).trim();
    if (!text) return '';
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try { return JSON.parse(text); } catch (_) { return text; }
    }
    return text;
  }

  function parseLines(value) {
    return String(value || '').split('\n').map((v) => v.trim()).filter(Boolean);
  }

  function toLines(value) {
    if (Array.isArray(value)) return value.join('\n');
    if (typeof value === 'string') return value;
    return '';
  }

  function uniqueValues(list) {
    return [...new Set((list || []).map((v) => toText(v).trim()).filter(Boolean))];
  }

  function collectOptionSets() {
    const db = getDB();
    const animes = Array.isArray(db?.animes) ? db.animes : [];

    const categories = [];
    const ratingContent = [];
    const ratingAge = ['L', '10', '12', '14', '16', '18'];

    animes.forEach((anime) => {
      (Array.isArray(anime?.categories) ? anime.categories : []).forEach((c) => categories.push(c));
      (Array.isArray(anime?.rating_content) ? anime.rating_content : []).forEach((c) => ratingContent.push(c));
      if (anime?.rating_age) ratingAge.push(anime.rating_age);
    });

    return {
      categories: uniqueValues(categories),
      ratingContent: uniqueValues(ratingContent),
      ratingAge: uniqueValues(ratingAge)
    };
  }

  async function readMediaDuration(url) {
    return new Promise((resolve, reject) => {
      const media = document.createElement('video');
      media.preload = 'metadata';
      media.src = url;
      media.onloadedmetadata = () => {
        const d = media.duration;
        media.removeAttribute('src');
        media.load();
        if (Number.isFinite(d) && d > 0) resolve(d);
        else reject(new Error('Duração inválida'));
      };
      media.onerror = () => reject(new Error('Não foi possível ler a duração'));
    });
  }

  function saveEditsLocal() {
    const db = getDB();
    if (!db) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ animes: db.animes || [], collections: db.collections || [] }));
  }

  function loadEditsLocal() {
    try {
      const text = localStorage.getItem(STORE_KEY);
      if (!text) return null;
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.animes)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function downloadJson() {
    const db = getDB();
    if (!db) return;
    const payload = JSON.stringify({ animes: db.animes || [], collections: db.collections || [] }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anime-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function applyDBAndRerender() {
    const db = getDB();
    if (!db) return;
    db.sortAnimesByDate?.();
    db.processMusicData?.();

    window.loadNewReleases?.();
    window.loadFullCatalog?.();
    window.loadAnimeSection?.('anime');
    window.loadAnimeSection?.('movie');
    window.loadAnimeSection?.('ova');
    window.loadCollections?.();
    window.renderMusicGrid?.();
    const list = db.getContinueWatching?.() || [];
    window.renderContinueWatchingGrid?.(list, 'continue-watching-grid');
    window.renderContinueWatchingGrid?.(list, 'continue-grid');

    window.dispatchEvent(new Event('animeDataLoaded'));
    if (adminEnabled) decorateEditableCards();
  }

  function getAnimeById(animeId) {
    const id = Number(animeId);
    const db = getDB();
    if (!db?.animes) return null;
    return db.animes.find((a) => Number(a.id) === id) || null;
  }

  function adminBadge() {
    const badge = document.createElement('button');
    badge.className = 'admin-edit-chip';
    badge.type = 'button';
    badge.innerHTML = '<i class="fas fa-pen"></i>';
    badge.title = 'Editar anime';
    return badge;
  }

  function topLevelFields(anime) {
    const preferred = ['title', 'description', 'thumbnail', 'cover', 'banner', 'trailer', 'year', 'rating', 'dateAdded'];
    const out = preferred.map((k) => [k, anime?.[k]]);
    Object.keys(anime || {}).forEach((k) => {
      if (['id', 'type', 'rating_age', 'rating_content', 'seasons', 'openings', 'endings', 'osts', 'categories'].includes(k)) return;
      if (preferred.includes(k)) return;
      out.push([k, anime[k]]);
    });
    return out;
  }

  function collectExtraPairs(obj, excludedKeys) {
    const excluded = new Set(excludedKeys || []);
    const pairs = [];
    Object.keys(obj || {}).forEach((k) => {
      if (excluded.has(k)) return;
      const value = obj[k];
      if (value === undefined) return;
      if (typeof value === 'object' && value !== null) {
        pairs.push([k, JSON.stringify(value)]);
      } else {
        pairs.push([k, toText(value)]);
      }
    });
    return pairs;
  }


  function getCoreFieldValue(anime, key) {
    if (key === 'scoreUnified') return toText(anime?.rating ?? anime?.score ?? anime?.nota ?? '');
    if (key === 'yearUnified') return toText(anime?.year ?? anime?.releaseYear ?? anime?.ano ?? anime?.launchYear ?? '');
    return toText(anime?.[key] ?? '');
  }

  function renderCoreFields(anime) {
    const fields = [
      ['title', 'Título'],
      ['description', 'Descrição'],
      ['type', 'Tipo (anime/movie/ova)'],
      ['yearUnified', 'Ano'],
      ['scoreUnified', 'Nota'],
      ['thumbnail', 'Thumbnail'],
      ['cover', 'Capa'],
      ['banner', 'Banner'],
      ['trailer', 'Trailer'],
      ['dateAdded', 'Data de adição']
    ];
    return fields.map(([k, label]) => `<label>${label}<input data-core="${k}" value="${escAttr(getCoreFieldValue(anime, k))}"></label>`).join('');
  }

  function renderTypeChoices(selected) {
    const opts = ['anime', 'movie', 'ova'];
    return `
      <div class="inplace-choice-group" data-choice-group="type">
        ${opts.map((t) => `<button type="button" class="inplace-pill ${selected === t ? 'active' : ''}" data-type-choice="${t}">${t.toUpperCase()}</button>`).join('')}
      </div>
    `;
  }

  function renderTagChecklist(title, key, selected, options) {
    const selectedSet = new Set((Array.isArray(selected) ? selected : []).map((v) => toText(v)));
    return `
      <div class="inplace-tag-block" data-tag-block="${key}">
        <div class="inplace-media-group-head">
          <strong>${title}</strong>
          <span class="inplace-tip">Marque/desmarque (sem código)</span>
        </div>
        <div class="inplace-tag-list">
          ${(options || []).map((opt) => `<label class="inplace-check"><input type="checkbox" data-tag="${key}" value="${escAttr(opt)}" ${selectedSet.has(opt) ? 'checked' : ''}>${opt}</label>`).join('')}
        </div>
        <div class="inplace-tag-add">
          <input type="text" data-tag-new="${key}" placeholder="Adicionar novo ${title.toLowerCase()}">
          <button type="button" class="btn btn-secondary" data-tag-add-btn="${key}">+ Adicionar</button>
        </div>
      </div>
    `;
  }

  function renderArrayPreviewSection(anime) {
    const groups = [
      ['openings', toLines(anime.openings)],
      ['endings', toLines(anime.endings)],
      ['osts', toLines(anime.osts)]
    ];

    return groups.map(([name, lines]) => `
      <div class="inplace-media-group" data-media-group="${name}">
        <div class="inplace-media-group-head">
          <strong>${name}</strong>
          <button type="button" class="btn btn-secondary inplace-add-media" data-add-media="${name}">+ Música</button>
        </div>
        <textarea data-array="${name}" placeholder="1 URL por linha">${lines}</textarea>
        <div class="inplace-media-preview-list" data-preview-list="${name}"></div>
      </div>
    `).join('');
  }

  function renderEpisodesEditor(anime) {
    const seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
    return seasons.map((season, sIdx) => {
      const episodes = Array.isArray(season.episodes) ? season.episodes : [];
      const seasonExtras = collectExtraPairs(season, ['number', 'name', 'episodes']);
      const eps = episodes.map((ep, eIdx) => {
        const opStart = Number(ep?.opening?.start ?? 0);
        const opEnd = Number(ep?.opening?.end ?? 0);
        const edStart = Number(ep?.ending?.start ?? 0);
        const edEnd = Number(ep?.ending?.end ?? 0);
        const epExtras = collectExtraPairs(ep, ['title', 'duration', 'videoUrl', 'opening', 'ending']);
        return `
        <div class="inplace-episode" data-s="${sIdx}" data-e="${eIdx}">
          <input data-ep="title" placeholder="Título" value="${escAttr(ep?.title)}">
          <input data-ep="duration" placeholder="Duração" value="${escAttr(timeToHMS(ep?.duration || 0))}" readonly>
          <input data-ep="videoUrl" placeholder="URL do vídeo" value="${escAttr(ep?.videoUrl)}">
          <input data-ep="openingStart" placeholder="Abertura início (segundos)" inputmode="numeric" value="${escAttr(opStart)}">
          <input data-ep="openingEnd" placeholder="Abertura fim (segundos)" inputmode="numeric" value="${escAttr(opEnd)}">
          <input data-ep="endingStart" placeholder="Ending início (segundos)" inputmode="numeric" value="${escAttr(edStart)}">
          <input data-ep="endingEnd" placeholder="Ending fim (segundos)" inputmode="numeric" value="${escAttr(edEnd)}">
          <span class="inplace-duration-view" data-duration-view>${escAttr(timeToHMS(ep?.duration || 0))}</span>
          <div class="inplace-opening-actions">
            <button type="button" class="btn btn-secondary inplace-set-opening-start">Pegar início (player)</button>
            <button type="button" class="btn btn-secondary inplace-set-opening-end">Pegar fim (player)</button>
            <button type="button" class="btn btn-secondary inplace-opening-add30">+30s</button>
            <button type="button" class="btn btn-secondary inplace-opening-add90">+1:30</button>
          </div>
          <button type="button" class="btn btn-secondary inplace-read-duration">Ler tempo</button>
          <button type="button" class="btn btn-secondary inplace-preview-episode">Preview Vídeo</button>
          <button type="button" class="btn btn-secondary inplace-remove-episode">Remover EP</button>
          ${epExtras.length ? `<div class="inplace-extra-fields">${epExtras.map(([k, v]) => `<label>${k}<input data-ep-extra-key="${escAttr(k)}" value="${escAttr(v)}"></label>`).join('')}</div>` : ''}
        </div>`;
      }).join('');
      return `
        <div class="inplace-season" data-s="${sIdx}">
          <div class="inplace-season-head">
            <strong>Temporada ${sIdx + 1}</strong>
            <button type="button" class="btn btn-secondary inplace-add-episode">+ Episódio</button>
            <button type="button" class="btn btn-secondary inplace-remove-season">Remover Temporada</button>
          </div>
          <div class="inplace-season-basics">
            <label>Número da temporada<input data-season="number" value="${escAttr(season?.number ?? (sIdx + 1))}"></label>
            <label>Nome da temporada<input data-season="name" value="${escAttr(season?.name || '')}"></label>
          </div>
          ${seasonExtras.length ? `<div class="inplace-extra-fields">${seasonExtras.map(([k, v]) => `<label>${k}<input data-season-extra-key="${escAttr(k)}" value="${escAttr(v)}"></label>`).join('')}</div>` : ''}
          ${eps}
        </div>
      `;
    }).join('');
  }

  function wireArrayPreview(card) {
    const previewAudio = card.querySelector('.inplace-preview-audio');
    card.querySelectorAll('[data-array]').forEach((textarea) => {
      const key = textarea.dataset.array;
      const render = () => {
        const host = card.querySelector(`[data-preview-list="${key}"]`);
        if (!host) return;
        const lines = parseLines(textarea.value);
        host.innerHTML = lines.slice(0, 8).map((url, i) => `
          <button type="button" class="btn btn-secondary inplace-preview-media" data-url="${escAttr(url)}">▶ ${key} ${i + 1}</button>
        `).join('');

        host.querySelectorAll('.inplace-preview-media').forEach((btn) => {
          btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            if (!url || !previewAudio) return;
            previewAudio.src = url;
            previewAudio.style.display = 'block';
            previewAudio.play().catch(() => {});
          });
        });
      };
      textarea.addEventListener('input', render);
      render();
    });

    card.querySelectorAll('.inplace-add-media').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.addMedia;
        const area = card.querySelector(`[data-array="${key}"]`);
        if (!area) return;
        area.value = (area.value.trim() ? `${area.value.trim()}\n` : '') + 'https://';
        area.dispatchEvent(new Event('input'));
      });
    });
  }

  function getCurrentPlayerSeconds() {
    const player = byId('anime-player');
    if (!player || !Number.isFinite(player.currentTime)) return null;
    return Math.max(0, Math.floor(player.currentTime));
  }

  function getEditingContextRow(card) {
    const playing = window.currentWatchingAnime;
    if (!playing) return null;
    const cardId = Number(card.dataset.animeId || 0);
    if (!cardId || Number(playing.id) !== cardId) return null;
    const sIdx = Number(playing.season || 1) - 1;
    const eIdx = Number(playing.episode || 1) - 1;
    return card.querySelector(`.inplace-episode[data-s="${sIdx}"][data-e="${eIdx}"]`);
  }

  function syncOpeningInputs(row) {
    if (!row) return;
    const startInput = row.querySelector('input[data-ep="openingStart"]');
    const endInput = row.querySelector('input[data-ep="openingEnd"]');
    const endingStartInput = row.querySelector('input[data-ep="endingStart"]');
    const endingEndInput = row.querySelector('input[data-ep="endingEnd"]');
    if (!startInput || !endInput) return;

    const startSec = parseTimeToSeconds(startInput.value);
    const endSec = parseTimeToSeconds(endInput.value);
    startInput.value = String(startSec);
    endInput.value = String(Math.max(endSec, startSec));

    if (endingStartInput && endingEndInput) {
      const edStartSec = parseTimeToSeconds(endingStartInput.value);
      const edEndSec = parseTimeToSeconds(endingEndInput.value);
      endingStartInput.value = String(edStartSec);
      endingEndInput.value = String(Math.max(edEndSec, edStartSec));
    }

    [startInput, endInput, endingStartInput, endingEndInput].forEach((input) => {
      if (!input) return;
      const parsed = Number(input.value);
      input.setCustomValidity(Number.isFinite(parsed) && parsed >= 0 ? '' : 'Use segundos válidos (número inteiro >= 0).');
    });
  }

  function wireOpeningTimingActions(card) {
    const applyFromPlayer = (targetSelector) => {
      const row = getEditingContextRow(card);
      const seconds = getCurrentPlayerSeconds();
      if (!row || seconds === null) return;
      const input = row.querySelector(targetSelector);
      if (!input) return;
      input.value = String(seconds);
      syncOpeningInputs(row);
    };

    card.querySelectorAll('.inplace-set-opening-start').forEach((btn) => {
      btn.addEventListener('click', () => applyFromPlayer('input[data-ep="openingStart"]'));
    });

    card.querySelectorAll('.inplace-set-opening-end').forEach((btn) => {
      btn.addEventListener('click', () => applyFromPlayer('input[data-ep="openingEnd"]'));
    });

    card.querySelectorAll('.inplace-opening-add30').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inplace-episode');
        if (!row) return;
        const startInput = row.querySelector('input[data-ep="openingStart"]');
        const endInput = row.querySelector('input[data-ep="openingEnd"]');
        if (!startInput || !endInput) return;
        const startSec = parseTimeToSeconds(startInput.value);
        endInput.value = timeToHMS(startSec + 30);
        syncOpeningInputs(row);
      });
    });

    card.querySelectorAll('.inplace-opening-add90').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inplace-episode');
        if (!row) return;
        const startInput = row.querySelector('input[data-ep="openingStart"]');
        const endInput = row.querySelector('input[data-ep="openingEnd"]');
        if (!startInput || !endInput) return;
        const startSec = parseTimeToSeconds(startInput.value);
        endInput.value = timeToHMS(startSec + 90);
        syncOpeningInputs(row);
      });
    });
  }

  function wireTagUI(card, key) {
    const addBtn = card.querySelector(`[data-tag-add-btn="${key}"]`);
    addBtn?.addEventListener('click', () => {
      const input = card.querySelector(`[data-tag-new="${key}"]`);
      const value = input?.value?.trim();
      if (!value) return;
      const list = card.querySelector(`[data-tag-block="${key}"] .inplace-tag-list`);
      if (!list) return;
      const exists = [...list.querySelectorAll('input[data-tag="' + key + '"]')].some((el) => el.value.toLowerCase() === value.toLowerCase());
      if (exists) return;
      const label = document.createElement('label');
      label.className = 'inplace-check';
      label.innerHTML = `<input type="checkbox" data-tag="${key}" value="${escAttr(value)}" checked>${value}`;
      list.appendChild(label);
      input.value = '';
    });
  }

  function readChecked(card, key) {
    return [...card.querySelectorAll(`input[data-tag="${key}"]:checked`)].map((el) => el.value.trim()).filter(Boolean);
  }

  function enterEditMode(card, anime, isNew) {
    card.classList.add('admin-editing-card');
    card.classList.remove('admin-editable-card');

    const options = collectOptionSets();
    const ratingContentCurrent = Array.isArray(anime.rating_content) ? anime.rating_content : [];
    const categoriesCurrent = Array.isArray(anime.categories) ? anime.categories : [];

    card.innerHTML = `
      <div class="inplace-edit">
        <div class="inplace-preview">
          <img class="inplace-preview-image" src="${escAttr(anime.thumbnail || anime.cover || 'images/bg-default.jpg')}" alt="preview">
          <video class="inplace-preview-video" controls muted playsinline style="display:none"></video>
          <audio class="inplace-preview-audio" controls style="display:none"></audio>
        </div>

        <div class="inplace-grid">
          <label>Tipo
            ${renderTypeChoices(anime.type || 'anime')}
          </label>
          <label>Classificação (idade)
            <select data-k="rating_age">
              ${options.ratingAge.map((r) => `<option value="${escAttr(r)}" ${(anime.rating_age === r) ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>
          ${renderCoreFields(anime)}
          <details class="inplace-extra-details"><summary>Campos extras do anime</summary>${topLevelFields(anime).map(([k, v]) => `<label>${k}<input data-k="${k}" value="${escAttr(v)}"></label>`).join('')}</details>
        </div>

        ${renderTagChecklist('Categorias', 'categories', categoriesCurrent, options.categories)}
        ${renderTagChecklist('Conteúdo da classificação', 'rating_content', ratingContentCurrent, options.ratingContent)}

        <div class="inplace-media-wrap">
          ${renderArrayPreviewSection(anime)}
        </div>

        <div class="inplace-seasons-wrap">
          <div class="inplace-season-head">
            <strong>Temporadas/Episódios</strong>
            <button type="button" class="btn btn-primary inplace-add-season">+ Temporada</button>
          </div>
          ${renderEpisodesEditor(anime)}
        </div>

        <div class="inplace-actions">
          <button type="button" class="btn btn-primary inplace-save">Salvar</button>
          <button type="button" class="btn btn-secondary inplace-cancel">Cancelar</button>
        </div>
      </div>
    `;

    // keep clicks inside editor from bubbling to parent card/modal handlers
    card.addEventListener('click', (e) => {
      if (e.target && e.target.closest('.inplace-edit')) {
        e.stopPropagation();
      }
    });

    wireArrayPreview(card);
    wireOpeningTimingActions(card);
    wireTagUI(card, 'categories');
    wireTagUI(card, 'rating_content');

    card.querySelectorAll('[data-type-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('[data-type-choice]').forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const updateImagePreview = () => {
      const image = card.querySelector('.inplace-preview-image');
      const thumb = card.querySelector('input[data-k="thumbnail"]')?.value || card.querySelector('input[data-k="cover"]')?.value;
      if (image && thumb) image.src = thumb;
    };
    card.querySelector('input[data-k="thumbnail"]')?.addEventListener('input', updateImagePreview);
    card.querySelector('input[data-k="cover"]')?.addEventListener('input', updateImagePreview);

    card.querySelectorAll('.inplace-read-duration').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.inplace-episode');
        const url = row?.querySelector('input[data-ep="videoUrl"]')?.value?.trim();
        const durationInput = row?.querySelector('input[data-ep="duration"]');
        const durationView = row?.querySelector('[data-duration-view]');
        if (!url || !durationInput) return;
        btn.disabled = true;
        btn.textContent = 'Lendo...';
        try {
          const seconds = await readMediaDuration(url);
          const formatted = timeToHMS(seconds);
          durationInput.value = formatted;
          if (durationView) durationView.textContent = formatted;
        } catch (_) {
          if (durationView) durationView.textContent = 'erro ao ler';
        } finally {
          btn.disabled = false;
          btn.textContent = 'Ler tempo';
        }
      });
    });

    card.querySelectorAll('.inplace-preview-episode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inplace-episode');
        const url = row?.querySelector('input[data-ep="videoUrl"]')?.value?.trim();
        const player = card.querySelector('.inplace-preview-video');
        if (!url || !player) return;
        player.src = url;
        player.style.display = 'block';
        player.play().catch(() => {});
      });
    });

    card.querySelectorAll('.inplace-add-episode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.closest('.inplace-season')?.dataset.s);
        if (!Number.isFinite(sIdx)) return;
        anime.seasons[sIdx].episodes = Array.isArray(anime.seasons[sIdx].episodes) ? anime.seasons[sIdx].episodes : [];
        anime.seasons[sIdx].episodes.push({ title: 'Novo episódio', duration: 0, videoUrl: '', opening: { start: 0, end: 90 }, ending: { start: 0, end: 0 } });
        enterEditMode(card, anime, isNew);
      });
    });

    card.querySelectorAll('.inplace-remove-episode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inplace-episode');
        const sIdx = Number(row?.dataset.s);
        const eIdx = Number(row?.dataset.e);
        if (!Number.isFinite(sIdx) || !Number.isFinite(eIdx)) return;
        anime.seasons[sIdx].episodes.splice(eIdx, 1);
        enterEditMode(card, anime, isNew);
      });
    });

    card.querySelectorAll('.inplace-remove-season').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.closest('.inplace-season')?.dataset.s);
        if (!Number.isFinite(sIdx)) return;
        anime.seasons.splice(sIdx, 1);
        enterEditMode(card, anime, isNew);
      });
    });

    card.querySelector('.inplace-add-season')?.addEventListener('click', () => {
      anime.seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
      anime.seasons.push({ number: anime.seasons.length + 1, episodes: [] });
      enterEditMode(card, anime, isNew);
    });

    card.querySelector('.inplace-cancel')?.addEventListener('click', () => {
      applyDBAndRerender();
    });

    card.querySelector('.inplace-save')?.addEventListener('click', () => {
      const typeBtn = card.querySelector('[data-type-choice].active');
      anime.type = typeBtn?.dataset.typeChoice || anime.type || 'anime';

      card.querySelectorAll('[data-core]').forEach((el) => {
        const key = el.dataset.core;
        const value = el.value;
        if (key === 'scoreUnified') {
          anime.rating = value;
          anime.score = value;
          anime.nota = value;
        } else if (key === 'yearUnified') {
          anime.year = value;
          anime.releaseYear = value;
          anime.ano = value;
          anime.launchYear = value;
        } else {
          anime[key] = value;
        }
      });

      card.querySelectorAll('[data-k]').forEach((el) => {
        anime[el.dataset.k] = parseLooseValue(el.value);
      });

      anime.categories = readChecked(card, 'categories');
      anime.rating_content = readChecked(card, 'rating_content');

      card.querySelectorAll('[data-array]').forEach((el) => {
        anime[el.dataset.array] = parseLines(el.value);
      });

      card.querySelectorAll('.inplace-episode').forEach((row) => {
        const sIdx = Number(row.dataset.s);
        const eIdx = Number(row.dataset.e);
        const target = anime.seasons?.[sIdx]?.episodes?.[eIdx];
        if (!target) return;
        target.title = row.querySelector('input[data-ep="title"]')?.value || '';
        target.duration = parseTimeToSeconds(row.querySelector('input[data-ep="duration"]')?.value || 0);
        target.videoUrl = row.querySelector('input[data-ep="videoUrl"]')?.value || '';
        const opStart = parseTimeToSeconds(row.querySelector('input[data-ep="openingStart"]')?.value || 0);
        const opEnd = parseTimeToSeconds(row.querySelector('input[data-ep="openingEnd"]')?.value || 0);
        const edStart = parseTimeToSeconds(row.querySelector('input[data-ep="endingStart"]')?.value || 0);
        const edEnd = parseTimeToSeconds(row.querySelector('input[data-ep="endingEnd"]')?.value || 0);
        target.opening = { start: opStart, end: Math.max(opEnd, opStart) };
        target.ending = { start: edStart, end: Math.max(edEnd, edStart) };
        row.querySelectorAll('input[data-ep-extra-key]').forEach((extra) => {
          const key = extra.dataset.epExtraKey;
          if (!key) return;
          target[key] = parseLooseValue(extra.value);
        });
      });

      card.querySelectorAll('.inplace-season').forEach((seasonRow) => {
        const sIdx = Number(seasonRow.dataset.s);
        const targetSeason = anime.seasons?.[sIdx];
        if (!targetSeason) return;
        const numberValue = seasonRow.querySelector('input[data-season="number"]')?.value;
        const parsedNumber = Number(numberValue);
        targetSeason.number = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : (sIdx + 1);
        targetSeason.name = seasonRow.querySelector('input[data-season="name"]')?.value || '';
        seasonRow.querySelectorAll('input[data-season-extra-key]').forEach((extra) => {
          const key = extra.dataset.seasonExtraKey;
          if (!key) return;
          targetSeason[key] = parseLooseValue(extra.value);
        });
      });

      const db = getDB();
      if (!db) return;
      if (isNew) {
        anime.id = Date.now();
        db.animes.unshift(anime);
      } else {
        const idx = db.animes.findIndex((a) => Number(a.id) === Number(anime.id));
        if (idx >= 0) db.animes[idx] = anime;
      }

      saveEditsLocal();
      applyDBAndRerender();
    });
  }

  function makeCardsDraggable(grid) {
    const cards = [...grid.querySelectorAll('.anime-card[data-anime-id]:not(.continue-card)')];
    cards.forEach((card) => {
      card.draggable = true;
      card.addEventListener('dragstart', () => {
        dragAnimeId = Number(card.dataset.animeId);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => e.preventDefault());
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = Number(card.dataset.animeId);
        if (!dragAnimeId || !targetId || dragAnimeId === targetId) return;
        const db = getDB();
        if (!db?.animes) return;
        const from = db.animes.findIndex((a) => Number(a.id) === dragAnimeId);
        const to = db.animes.findIndex((a) => Number(a.id) === targetId);
        if (from < 0 || to < 0) return;
        const moved = db.animes.splice(from, 1)[0];
        db.animes.splice(to, 0, moved);
        saveEditsLocal();
        applyDBAndRerender();
      });
    });
  }

  function addNewCard(grid) {
    const card = document.createElement('div');
    card.className = 'anime-card admin-new-card';
    card.innerHTML = '<div class="anime-info"><h3 class="anime-title">+ Novo Anime/Filme/OVA</h3><p class="anime-meta">Clique para criar</p></div>';
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      enterEditMode(card, {
        id: '',
        title: '', description: '', thumbnail: 'images/bg-default.jpg', cover: 'images/bg-default.jpg', banner: '', trailer: '',
        type: 'anime', year: '', rating: '', dateAdded: new Date().toISOString(), rating_age: '14', rating_content: [],
        categories: [], openings: [], endings: [], osts: [], seasons: [{ number: 1, episodes: [] }]
      }, true);
    });
    grid.prepend(card);
  }

  function decorateEditableCards() {
    if (!adminEnabled) return;
    document.querySelectorAll('.anime-grid').forEach((grid) => {
      makeCardsDraggable(grid);
      grid.querySelectorAll('.anime-card[data-anime-id]').forEach((card) => {
        if (card.classList.contains('continue-card')) return;
        card.classList.add('admin-editable-card');
        if (!card.querySelector('.admin-edit-chip')) {
          const chip = adminBadge();
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const anime = getAnimeById(card.dataset.animeId);
            if (!anime) return;
            enterEditMode(card, clone(anime), false);
          });
          card.appendChild(chip);
        }
      });
    });

    const catalog = byId('full-catalog-grid');
    if (catalog && !catalog.querySelector('.admin-new-card')) addNewCard(catalog);
  }

  function clearAdminDecorations() {
    document.querySelectorAll('.admin-edit-chip').forEach((el) => el.remove());
    document.querySelectorAll('.admin-new-card').forEach((el) => el.remove());
    document.querySelectorAll('.admin-editable-card').forEach((el) => {
      el.classList.remove('admin-editable-card');
      el.draggable = false;
    });
  }

  function addTypeQuick(type) {
    const db = getDB();
    if (!db?.animes) return;
    db.animes.unshift({
      id: Date.now(),
      title: `Novo ${type.toUpperCase()}`,
      description: '',
      thumbnail: 'images/bg-default.jpg',
      cover: 'images/bg-default.jpg',
      banner: '', trailer: '',
      type,
      year: '', rating: '',
      dateAdded: new Date().toISOString(),
      rating_age: '14', rating_content: [],
      categories: [],
      openings: [], endings: [], osts: [],
      seasons: [{ number: 1, episodes: [] }]
    });
    saveEditsLocal();
    applyDBAndRerender();
  }

  function closeVideoModalIfOpen() {
    const modal = byId('video-modal');
    if (!modal || !modal.classList.contains('show')) return;
    const close = byId('close-video');
    if (close) close.click();
  }

  function toggleAdmin(force) {
    adminEnabled = force !== undefined ? !!force : !adminEnabled;
    document.body.classList.toggle('admin-inline-mode', adminEnabled);
    if (adminEnabled) {
      closeVideoModalIfOpen();
      decorateEditableCards();
      const catalog = byId('full-catalog');
      catalog?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      clearAdminDecorations();
      applyDBAndRerender();
    }
    window.dispatchEvent(new Event('adminModeChanged'));
  }

  function ensureAdminBar() {
    if (byId('admin-inline-toggle')) return;
    const bar = document.createElement('div');
    bar.className = 'admin-inline-bar';
    bar.innerHTML = `
      <button id="admin-inline-toggle" class="btn btn-secondary" type="button"><i class="fas fa-user-shield"></i> Admin</button>
      <button id="admin-inline-add-anime" class="btn btn-secondary" type="button" style="display:none">+ Anime</button>
      <button id="admin-inline-add-movie" class="btn btn-secondary" type="button" style="display:none">+ Filme</button>
      <button id="admin-inline-add-ova" class="btn btn-secondary" type="button" style="display:none">+ OVA</button>
      <button id="admin-inline-download" class="btn btn-secondary" type="button" style="display:none">Baixar JSON</button>
      <button id="admin-inline-exit" class="btn btn-secondary" type="button" style="display:none">Sair edição</button>
      <span id="admin-inline-help" style="display:none">Clique no ✏️ dos cards no Catálogo Completo para editar visualmente</span>
    `;
    document.body.appendChild(bar);

    const toggleBtn = byId('admin-inline-toggle');
    const exitBtn = byId('admin-inline-exit');
    const dlBtn = byId('admin-inline-download');
    const addAnime = byId('admin-inline-add-anime');
    const addMovie = byId('admin-inline-add-movie');
    const addOva = byId('admin-inline-add-ova');
    const helpText = byId('admin-inline-help');

    function syncButtons() {
      [exitBtn, dlBtn, addAnime, addMovie, addOva].forEach((el) => { if (el) el.style.display = adminEnabled ? 'inline-flex' : 'none'; });
      if (helpText) helpText.style.display = adminEnabled ? 'inline-flex' : 'none';
      if (toggleBtn) toggleBtn.textContent = adminEnabled ? 'Modo Admin ativo' : 'Admin';
      bar.classList.toggle('visible', adminUnlocked);
    }

    toggleBtn?.addEventListener('click', () => {
      if (!adminEnabled) {
        const pin = prompt('PIN admin:');
        if (pin !== ADMIN_PIN) return;
        adminUnlocked = true;
        sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1');
      }
      toggleAdmin();
      syncButtons();
    });

    exitBtn?.addEventListener('click', () => {
      toggleAdmin(false);
      syncButtons();
    });

    dlBtn?.addEventListener('click', downloadJson);
    addAnime?.addEventListener('click', () => addTypeQuick('anime'));
    addMovie?.addEventListener('click', () => addTypeQuick('movie'));
    addOva?.addEventListener('click', () => addTypeQuick('ova'));

    // Hidden unlock: Ctrl+Shift+A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        const pin = prompt('PIN admin:');
        if (pin !== ADMIN_PIN) return;
        adminUnlocked = true;
        sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1');
        bar.classList.add('visible');
      }
    });

    syncButtons();
  }


  function openInlineEditorInHost(animeId, hostElement) {
    if (!adminEnabled || !hostElement) return false;
    const anime = getAnimeById(animeId);
    if (!anime) return false;
    hostElement.classList.add('admin-modal-edit-host');
    enterEditMode(hostElement, clone(anime), false);
    return true;
  }

  function init() {
    ensureAdminBar();

    const local = loadEditsLocal();
    if (local && getDB()) {
      getDB().animes = local.animes;
      getDB().collections = Array.isArray(local.collections) ? local.collections : getDB().collections;
      applyDBAndRerender();
    }

    window.addEventListener('animeDataLoaded', () => {
      if (adminEnabled) decorateEditableCards();
    });

    const mo = new MutationObserver(() => {
      if (adminEnabled) decorateEditableCards();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  window.openInlineEditorInHost = openInlineEditorInHost;
  window.isAdminInlineMode = () => adminEnabled;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
