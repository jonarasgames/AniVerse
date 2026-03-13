/* js/anime-editor.js - secret local anime-data editor (visual + JSON) */
(function () {
  'use strict';

  const SECRET_PIN = 'rafaaxprs';
  let currentData = { animes: [], collections: [] };
  let currentView = 'visual';

  const byId = (id) => document.getElementById(id);

  function setStatus(text, isError) {
    const el = byId('anime-editor-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? '#ff6b6b' : '';
  }

  function getCurrentPayload() {
    const db = window.animeDB;
    return {
      animes: Array.isArray(db?.animes) ? JSON.parse(JSON.stringify(db.animes)) : [],
      collections: Array.isArray(db?.collections) ? JSON.parse(JSON.stringify(db.collections)) : []
    };
  }

  function normalizePayload(raw) {
    const parsed = raw || {};
    const animes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.animes) ? parsed.animes : []);
    const collections = Array.isArray(parsed.collections) ? parsed.collections : [];
    return { animes, collections };
  }

  function syncJsonFromState() {
    const textarea = byId('anime-editor-textarea');
    const collections = byId('anime-editor-collections');
    if (textarea) textarea.value = JSON.stringify(currentData, null, 2);
    if (collections) collections.value = JSON.stringify(currentData.collections || [], null, 2);
  }

  function syncStateFromJson() {
    const textarea = byId('anime-editor-textarea');
    if (!textarea) throw new Error('Editor JSON não encontrado.');
    currentData = normalizePayload(JSON.parse(textarea.value || '{}'));
  }

  function toInput(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function inferYear(anime) {
    return anime.year ?? anime.releaseYear ?? anime.ano ?? anime.launchYear ?? '';
  }

  function inferScore(anime) {
    return anime.rating ?? anime.score ?? anime.nota ?? '';
  }

  function applyQuickFieldsToAnime(anime, fields) {
    anime.title = fields.title;
    anime.type = fields.type;
    anime.thumbnail = fields.thumbnail;
    anime.cover = fields.cover;
    anime.year = fields.year;
    anime.rating = fields.rating;
  }

  function renderVisualEditor() {
    const list = byId('anime-editor-visual-list');
    if (!list) return;

    list.innerHTML = '';
    (currentData.animes || []).forEach((anime, index) => {
      const row = document.createElement('div');
      row.className = 'anime-editor-row';
      row.draggable = true;
      row.dataset.index = String(index);

      row.innerHTML = `
        <div class="anime-editor-row-top">
          <span class="anime-editor-drag">↕ Arrastar</span>
          <strong>#${index + 1}</strong>
          <button type="button" class="btn btn-secondary anime-editor-remove">Remover</button>
        </div>
        <div class="anime-editor-grid">
          <label>Título <input type="text" class="anime-field" data-field="title" value="${toInput(anime.title || anime.name)}"></label>
          <label>Tipo <input type="text" class="anime-field" data-field="type" value="${toInput(anime.type || 'anime')}"></label>
          <label>Ano <input type="text" class="anime-field" data-field="year" value="${toInput(inferYear(anime))}"></label>
          <label>Nota <input type="text" class="anime-field" data-field="rating" value="${toInput(inferScore(anime))}"></label>
          <label>Thumbnail <input type="text" class="anime-field" data-field="thumbnail" value="${toInput(anime.thumbnail)}"></label>
          <label>Cover <input type="text" class="anime-field" data-field="cover" value="${toInput(anime.cover)}"></label>
        </div>
        <label class="anime-editor-advanced-label">JSON completo do anime
          <textarea class="anime-editor-advanced">${JSON.stringify(anime, null, 2)}</textarea>
        </label>
      `;

      row.querySelector('.anime-editor-remove')?.addEventListener('click', () => {
        currentData.animes.splice(index, 1);
        syncJsonFromState();
        renderVisualEditor();
      });

      row.querySelectorAll('.anime-field').forEach(input => {
        input.addEventListener('input', () => {
          const fields = {
            title: row.querySelector('[data-field="title"]')?.value || '',
            type: row.querySelector('[data-field="type"]')?.value || 'anime',
            year: row.querySelector('[data-field="year"]')?.value || '',
            rating: row.querySelector('[data-field="rating"]')?.value || '',
            thumbnail: row.querySelector('[data-field="thumbnail"]')?.value || '',
            cover: row.querySelector('[data-field="cover"]')?.value || ''
          };
          applyQuickFieldsToAnime(currentData.animes[index], fields);
          row.querySelector('.anime-editor-advanced').value = JSON.stringify(currentData.animes[index], null, 2);
          syncJsonFromState();
        });
      });

      row.querySelector('.anime-editor-advanced')?.addEventListener('change', (e) => {
        try {
          const parsed = JSON.parse(e.target.value || '{}');
          currentData.animes[index] = parsed;
          syncJsonFromState();
          renderVisualEditor();
        } catch (error) {
          setStatus(`JSON inválido no anime #${index + 1}: ${error.message}`, true);
        }
      });

      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(index));
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        const to = index;
        if (Number.isNaN(from) || from === to) return;
        const moved = currentData.animes.splice(from, 1)[0];
        currentData.animes.splice(to, 0, moved);
        syncJsonFromState();
        renderVisualEditor();
      });

      list.appendChild(row);
    });
  }

  function setView(view) {
    currentView = view;
    const visual = byId('anime-editor-visual');
    const json = byId('anime-editor-textarea');
    if (visual) visual.style.display = view === 'visual' ? 'block' : 'none';
    if (json) json.style.display = view === 'json' ? 'block' : 'none';
  }

  function loadCurrentIntoEditor() {
    currentData = getCurrentPayload();
    syncJsonFromState();
    renderVisualEditor();
    setStatus('JSON atual carregado.');
  }

  function formatJson() {
    try {
      syncStateFromJson();
      syncJsonFromState();
      renderVisualEditor();
      setStatus('JSON formatado.');
    } catch (error) {
      setStatus(`Erro ao formatar: ${error.message}`, true);
    }
  }

  function applyToSite() {
    try {
      if (currentView === 'json') syncStateFromJson();
      const collectionsText = byId('anime-editor-collections')?.value;
      if (collectionsText) currentData.collections = JSON.parse(collectionsText);

      if (!window.animeDB) throw new Error('animeDB ainda não carregou.');

      window.animeDB.animes = currentData.animes;
      window.animeDB.collections = currentData.collections;
      window.animeDB.sortAnimesByDate?.();
      window.animeDB.processMusicData?.();

      window.loadNewReleases?.();
      window.loadFullCatalog?.();
      window.loadAnimeSection?.('anime');
      window.loadAnimeSection?.('movie');
      window.loadAnimeSection?.('ova');
      window.loadCollections?.();
      window.renderMusicGrid?.();
      const list = window.animeDB.getContinueWatching?.() || [];
      window.renderContinueWatchingGrid?.(list, 'continue-watching-grid');
      window.renderContinueWatchingGrid?.(list, 'continue-grid');

      window.dispatchEvent(new Event('animeDataLoaded'));
      setStatus('JSON aplicado no site com sucesso.');
      syncJsonFromState();
      renderVisualEditor();
    } catch (error) {
      setStatus(`Erro no JSON: ${error.message}`, true);
    }
  }

  function copyJson() {
    const payload = JSON.stringify(currentData, null, 2);
    navigator.clipboard.writeText(payload).then(() => {
      setStatus('JSON copiado para a área de transferência.');
    }).catch(() => {
      const textarea = byId('anime-editor-textarea');
      if (!textarea) return;
      textarea.value = payload;
      textarea.select();
      document.execCommand('copy');
      setStatus('JSON copiado.');
    });
  }

  function downloadJson() {
    try {
      const payload = JSON.stringify(currentData, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'anime-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('Arquivo anime-data.json baixado.');
    } catch (error) {
      setStatus(`Erro ao baixar: ${error.message}`, true);
    }
  }

  function addAnime() {
    currentData.animes.push({
      id: Date.now(),
      title: 'Novo Anime',
      type: 'anime',
      year: '',
      rating: '',
      thumbnail: 'images/bg-default.jpg',
      cover: 'images/bg-default.jpg',
      seasons: []
    });
    syncJsonFromState();
    renderVisualEditor();
  }

  function openModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadCurrentIntoEditor();
    setView('visual');
  }

  function closeModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function requestAccessAndOpen() {
    const pin = prompt('PIN do editor:');
    if (!pin) return;
    if (pin !== SECRET_PIN) {
      alert('PIN incorreto.');
      return;
    }
    openModal();
  }

  function bindSecretTriggers() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'j') {
        requestAccessAndOpen();
      }
    });

    const logo = document.querySelector('.logo-container');
    let tapCount = 0;
    let lastTap = 0;
    logo?.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap > 1500) tapCount = 0;
      tapCount += 1;
      lastTap = now;
      if (tapCount >= 5) {
        tapCount = 0;
        requestAccessAndOpen();
      }
    });
  }

  function bind() {
    byId('close-anime-editor')?.addEventListener('click', closeModal);
    byId('anime-editor-load')?.addEventListener('click', loadCurrentIntoEditor);
    byId('anime-editor-format')?.addEventListener('click', formatJson);
    byId('anime-editor-apply')?.addEventListener('click', applyToSite);
    byId('anime-editor-copy')?.addEventListener('click', copyJson);
    byId('anime-editor-download')?.addEventListener('click', downloadJson);
    byId('anime-editor-add-anime')?.addEventListener('click', addAnime);
    byId('anime-editor-view-visual')?.addEventListener('click', () => setView('visual'));
    byId('anime-editor-view-json')?.addEventListener('click', () => setView('json'));

    byId('anime-editor-textarea')?.addEventListener('change', () => {
      try {
        syncStateFromJson();
        renderVisualEditor();
        setStatus('JSON sincronizado com o modo visual.');
      } catch (error) {
        setStatus(`Erro no JSON: ${error.message}`, true);
      }
    });

    byId('anime-editor-collections')?.addEventListener('change', (e) => {
      try {
        currentData.collections = JSON.parse(e.target.value || '[]');
        syncJsonFromState();
      } catch (error) {
        setStatus(`Coleções inválidas: ${error.message}`, true);
      }
    });

    window.addEventListener('click', (event) => {
      if (event.target === byId('anime-editor-modal')) closeModal();
    });

    bindSecretTriggers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
