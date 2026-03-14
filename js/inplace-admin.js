/* js/inplace-admin.js - in-place WYSIWYG admin editing */
(function () {
  'use strict';

  const ADMIN_PIN = 'rafaaxprs';
  const STORE_KEY = 'aniverse-admin-edits-v2';

  let adminEnabled = false;
  let dragAnimeId = null;

  const byId = (id) => document.getElementById(id);
  const toText = (v) => v === null || v === undefined ? '' : String(v);
  const escAttr = (v) => toText(v).replaceAll('"', '&quot;');

  function getDB() {
    return window.animeDB;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function timeToHMS(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }

  function parseLines(value) {
    return String(value || '').split('\n').map((v) => v.trim()).filter(Boolean);
  }

  function toLines(value) {
    if (Array.isArray(value)) return value.join('\n');
    if (typeof value === 'string') return value;
    return '';
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

  function adminBadge(card) {
    const badge = document.createElement('button');
    badge.className = 'admin-edit-chip';
    badge.type = 'button';
    badge.innerHTML = '<i class="fas fa-pen"></i>';
    badge.title = 'Editar anime in-place';
    return badge;
  }

  function topLevelFields(anime) {
    const preferred = ['title', 'description', 'thumbnail', 'cover', 'banner', 'trailer', 'type', 'year', 'rating', 'dateAdded', 'rating_age', 'rating_content'];
    const out = [];
    preferred.forEach((k) => out.push([k, anime?.[k]]));
    Object.keys(anime || {}).forEach((k) => {
      if (['id', 'seasons', 'openings', 'endings', 'osts', 'categories'].includes(k)) return;
      if (preferred.includes(k)) return;
      out.push([k, anime[k]]);
    });
    return out;
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
      const eps = episodes.map((ep, eIdx) => `
        <div class="inplace-episode" data-s="${sIdx}" data-e="${eIdx}">
          <input data-ep="title" placeholder="Título" value="${escAttr(ep?.title)}">
          <input data-ep="duration" placeholder="Duração" value="${escAttr(ep?.duration)}" readonly>
          <input data-ep="videoUrl" placeholder="URL do vídeo" value="${escAttr(ep?.videoUrl)}">
          <input data-ep="opening" placeholder="Abertura (URL)" value="${escAttr(ep?.opening)}">
          <span class="inplace-duration-view" data-duration-view>${escAttr(ep?.duration || '--:--:--')}</span>
          <button type="button" class="btn btn-secondary inplace-read-duration">Ler tempo</button>
          <button type="button" class="btn btn-secondary inplace-preview-episode">Preview Vídeo</button>
          <button type="button" class="btn btn-secondary inplace-preview-opening">Preview Abertura</button>
          <button type="button" class="btn btn-secondary inplace-remove-episode">Remover EP</button>
        </div>`).join('');
      return `
        <div class="inplace-season" data-s="${sIdx}">
          <div class="inplace-season-head">
            <strong>Temporada ${sIdx + 1}</strong>
            <button type="button" class="btn btn-secondary inplace-add-episode">+ Episódio</button>
            <button type="button" class="btn btn-secondary inplace-remove-season">Remover Temporada</button>
          </div>
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

  function enterEditMode(card, anime, isNew) {
    card.classList.add('admin-editing-card');
    card.innerHTML = `
      <div class="inplace-edit">
        <div class="inplace-preview">
          <img class="inplace-preview-image" src="${escAttr(anime.thumbnail || anime.cover || 'images/bg-default.jpg')}" alt="preview">
          <video class="inplace-preview-video" controls muted playsinline style="display:none"></video>
          <audio class="inplace-preview-audio" controls style="display:none"></audio>
        </div>

        <div class="inplace-grid">
          ${topLevelFields(anime).map(([k, v]) => `<label>${k}<input data-k="${k}" value="${escAttr(v)}"></label>`).join('')}
          <label>categories<textarea data-array="categories">${toLines(anime.categories)}</textarea></label>
        </div>

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

    wireArrayPreview(card);

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

    card.querySelectorAll('.inplace-preview-opening').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inplace-episode');
        const url = row?.querySelector('input[data-ep="opening"]')?.value?.trim();
        const player = card.querySelector('.inplace-preview-audio');
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
        anime.seasons[sIdx].episodes.push({ title: 'Novo episódio', duration: '', videoUrl: '', opening: '' });
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
      card.querySelectorAll('[data-k]').forEach((el) => {
        anime[el.dataset.k] = el.value;
      });

      card.querySelectorAll('[data-array]').forEach((el) => {
        anime[el.dataset.array] = parseLines(el.value);
      });

      card.querySelectorAll('.inplace-episode').forEach((row) => {
        const sIdx = Number(row.dataset.s);
        const eIdx = Number(row.dataset.e);
        const target = anime.seasons?.[sIdx]?.episodes?.[eIdx];
        if (!target) return;
        target.title = row.querySelector('input[data-ep="title"]')?.value || '';
        target.duration = row.querySelector('input[data-ep="duration"]')?.value || '';
        target.videoUrl = row.querySelector('input[data-ep="videoUrl"]')?.value || '';
        target.opening = row.querySelector('input[data-ep="opening"]')?.value || '';
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
        type: 'anime', year: '', rating: '', dateAdded: new Date().toISOString(), rating_age: '', rating_content: '',
        categories: [], openings: [], endings: [], osts: [], seasons: [{ number: 1, episodes: [] }]
      }, true);
    });
    grid.prepend(card);
  }

  function decorateEditableCards() {
    if (!adminEnabled) return;
    const grids = document.querySelectorAll('.anime-grid');
    grids.forEach((grid) => {
      makeCardsDraggable(grid);
      grid.querySelectorAll('.anime-card[data-anime-id]').forEach((card) => {
        if (card.classList.contains('continue-card')) return;
        card.classList.add('admin-editable-card');
        if (!card.querySelector('.admin-edit-chip')) {
          const chip = adminBadge(card);
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
      banner: '',
      trailer: '',
      type,
      year: '',
      rating: '',
      dateAdded: new Date().toISOString(),
      categories: [],
      openings: [],
      endings: [],
      osts: [],
      seasons: [{ number: 1, episodes: [] }]
    });
    saveEditsLocal();
    applyDBAndRerender();
  }

  function toggleAdmin(force) {
    adminEnabled = force !== undefined ? !!force : !adminEnabled;
    document.body.classList.toggle('admin-inline-mode', adminEnabled);
    if (adminEnabled) decorateEditableCards();
    else {
      clearAdminDecorations();
      applyDBAndRerender();
    }
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
    `;
    document.body.appendChild(bar);

    const toggleBtn = byId('admin-inline-toggle');
    const exitBtn = byId('admin-inline-exit');
    const dlBtn = byId('admin-inline-download');
    const addAnime = byId('admin-inline-add-anime');
    const addMovie = byId('admin-inline-add-movie');
    const addOva = byId('admin-inline-add-ova');

    function syncButtons() {
      [exitBtn, dlBtn, addAnime, addMovie, addOva].forEach((el) => {
        if (el) el.style.display = adminEnabled ? 'inline-flex' : 'none';
      });
      if (toggleBtn) toggleBtn.textContent = adminEnabled ? 'Modo Admin ativo' : 'Admin';
    }

    toggleBtn?.addEventListener('click', () => {
      if (!adminEnabled) {
        const pin = prompt('PIN admin:');
        if (pin !== ADMIN_PIN) return;
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

    syncButtons();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
