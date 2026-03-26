/* js/anime-editor.js - secret visual anime editor */
(function () {
  'use strict';

  const SECRET_PIN = 'rafaaxprs';
  let currentData = { animes: [], collections: [] };

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
    return {
      animes: Array.isArray(parsed.animes) ? parsed.animes : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections : []
    };
  }

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function inferYear(anime) {
    return anime.year ?? anime.releaseYear ?? anime.ano ?? anime.launchYear ?? '';
  }

  function inferScore(anime) {
    return anime.rating ?? anime.score ?? anime.nota ?? '';
  }

  function parseMulti(value) {
    return String(value || '').split('\n').map(v => v.trim()).filter(Boolean);
  }

  function parseOptionalSeconds(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
  }

  function getEpisodeTimingFromRow(row, key) {
    const start = parseOptionalSeconds(row.querySelector(`[data-field="${key}Start"]`)?.value);
    const end = parseOptionalSeconds(row.querySelector(`[data-field="${key}End"]`)?.value);
    if (start === null && end === null) return null;
    if (start === null || end === null) return null;
    if (end <= start) return null;
    return { start, end };
  }

  function validateEpisodeTimingInputs(row, key) {
    const startInput = row.querySelector(`[data-field="${key}Start"]`);
    const endInput = row.querySelector(`[data-field="${key}End"]`);
    if (!startInput || !endInput) return true;

    const startText = String(startInput.value || '').trim();
    const endText = String(endInput.value || '').trim();
    const hasAny = !!startText || !!endText;
    const start = parseOptionalSeconds(startInput.value);
    const end = parseOptionalSeconds(endInput.value);

    startInput.setCustomValidity('');
    endInput.setCustomValidity('');

    if (!hasAny) return true;
    if (start === null || end === null) {
      const msg = 'Preencha início e fim com segundos válidos (>= 0).';
      startInput.setCustomValidity(msg);
      endInput.setCustomValidity(msg);
      return false;
    }
    if (end <= start) {
      endInput.setCustomValidity('O fim precisa ser maior que o início.');
      return false;
    }
    return true;
  }

  function toList(value) {
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === 'string') return value ? [value] : [];
    return [];
  }

  function syncJsonFromState() {
    const textarea = byId('anime-editor-textarea');
    if (textarea) textarea.value = JSON.stringify(currentData, null, 2);
    const collections = byId('anime-editor-collections');
    if (collections) collections.value = JSON.stringify(currentData.collections || [], null, 2);
  }

  function syncStateFromJson() {
    const textarea = byId('anime-editor-textarea');
    if (!textarea) return;
    try {
      currentData = normalizePayload(JSON.parse(textarea.value || '{}'));
      renderVisualEditor();
      setStatus('JSON importado para o modo visual.');
    } catch (error) {
      setStatus(`JSON inválido: ${error.message}`, true);
    }
  }

  function applyAnimeVisualFields(card, index) {
    const anime = currentData.animes[index];
    if (!anime) return;

    anime.title = card.querySelector('[data-field="title"]')?.value || '';
    anime.type = card.querySelector('[data-field="type"]')?.value || 'anime';
    anime.description = card.querySelector('[data-field="description"]')?.value || '';
    anime.thumbnail = card.querySelector('[data-field="thumbnail"]')?.value || '';
    anime.cover = card.querySelector('[data-field="cover"]')?.value || '';
    anime.banner = card.querySelector('[data-field="banner"]')?.value || '';
    anime.trailer = card.querySelector('[data-field="trailer"]')?.value || '';
    anime.year = card.querySelector('[data-field="year"]')?.value || '';
    anime.rating = card.querySelector('[data-field="rating"]')?.value || '';
    anime.categories = parseMulti((card.querySelector('[data-field="categories"]')?.value || '').replaceAll(',', '\n'));
    anime.openings = parseMulti(card.querySelector('[data-field="openings"]')?.value || '');
    anime.endings = parseMulti(card.querySelector('[data-field="endings"]')?.value || '');
    anime.osts = parseMulti(card.querySelector('[data-field="osts"]')?.value || '');

    syncJsonFromState();
  }

  function renderEpisodeEditor(animeIndex, seasonIndex, episodeIndex, episode) {
    const row = document.createElement('div');
    row.className = 'anime-editor-episode-row';
    row.innerHTML = `
      <div class="anime-editor-episode-head">
        <strong>Episódio ${episodeIndex + 1}</strong>
        <button type="button" class="btn btn-secondary anime-editor-remove-episode">Remover</button>
      </div>
      <div class="anime-editor-episode-grid">
        <label>Título <input type="text" class="episode-field" data-field="title" value="${toText(episode?.title)}"></label>
        <label>Duração <input type="text" class="episode-field" data-field="duration" value="${toText(episode?.duration)}"></label>
        <label>Vídeo URL <input type="text" class="episode-field" data-field="videoUrl" value="${toText(episode?.videoUrl)}"></label>
        <label>Opening início (s) <input type="number" min="0" step="1" class="episode-field" data-field="openingStart" value="${toText(episode?.opening?.start)}"></label>
        <label>Opening fim (s) <input type="number" min="0" step="1" class="episode-field" data-field="openingEnd" value="${toText(episode?.opening?.end)}"></label>
        <label>Ending início (s) <input type="number" min="0" step="1" class="episode-field" data-field="endingStart" value="${toText(episode?.ending?.start)}"></label>
        <label>Ending fim (s) <input type="number" min="0" step="1" class="episode-field" data-field="endingEnd" value="${toText(episode?.ending?.end)}"></label>
      </div>
      <div class="anime-editor-episode-actions">
        <button type="button" class="btn btn-secondary anime-editor-preview-video">Ver vídeo</button>
      </div>
    `;

    row.querySelectorAll('.episode-field').forEach((input) => {
      input.addEventListener('input', () => {
        const ep = currentData.animes[animeIndex]?.seasons?.[seasonIndex]?.episodes?.[episodeIndex];
        if (!ep) return;
        ep.title = row.querySelector('[data-field="title"]')?.value || '';
        ep.duration = row.querySelector('[data-field="duration"]')?.value || '';
        ep.videoUrl = row.querySelector('[data-field="videoUrl"]')?.value || '';
        const opening = getEpisodeTimingFromRow(row, 'opening');
        const ending = getEpisodeTimingFromRow(row, 'ending');
        if (opening) ep.opening = opening;
        else delete ep.opening;
        if (ending) ep.ending = ending;
        else delete ep.ending;
        validateEpisodeTimingInputs(row, 'opening');
        validateEpisodeTimingInputs(row, 'ending');
        syncJsonFromState();
      });
    });

    row.querySelector('.anime-editor-remove-episode')?.addEventListener('click', () => {
      const episodes = currentData.animes[animeIndex]?.seasons?.[seasonIndex]?.episodes;
      if (!Array.isArray(episodes)) return;
      episodes.splice(episodeIndex, 1);
      syncJsonFromState();
      renderVisualEditor();
    });

    row.querySelector('.anime-editor-preview-video')?.addEventListener('click', () => {
      const url = row.querySelector('[data-field="videoUrl"]')?.value?.trim();
      const preview = row.closest('.anime-editor-card')?.querySelector('.anime-editor-video-preview');
      if (!url || !preview) {
        setStatus('Coloque uma URL de vídeo válida para pré-visualizar.', true);
        return;
      }
      preview.src = url;
      preview.style.display = 'block';
      preview.play().catch(() => {});
      setStatus('Prévia do episódio carregada.');
    });

    return row;
  }

  function renderSeasonEditor(animeIndex, seasonIndex, season) {
    const block = document.createElement('div');
    block.className = 'anime-editor-season';
    block.innerHTML = `
      <div class="anime-editor-season-head">
        <label>Temporada <input type="number" min="1" class="anime-editor-season-number" value="${toText(season?.number || (seasonIndex + 1))}"></label>
        <button type="button" class="btn btn-secondary anime-editor-add-episode">+ Episódio</button>
        <button type="button" class="btn btn-secondary anime-editor-remove-season">Remover temporada</button>
      </div>
      <div class="anime-editor-episodes"></div>
    `;

    block.querySelector('.anime-editor-season-number')?.addEventListener('input', (e) => {
      const value = Number(e.target.value);
      currentData.animes[animeIndex].seasons[seasonIndex].number = Number.isFinite(value) && value > 0 ? value : (seasonIndex + 1);
      syncJsonFromState();
    });

    block.querySelector('.anime-editor-add-episode')?.addEventListener('click', () => {
      const seasonRef = currentData.animes[animeIndex]?.seasons?.[seasonIndex];
      if (!seasonRef) return;
      seasonRef.episodes = Array.isArray(seasonRef.episodes) ? seasonRef.episodes : [];
      seasonRef.episodes.push({ title: `Episódio ${seasonRef.episodes.length + 1}`, duration: '24 min', videoUrl: '' });
      syncJsonFromState();
      renderVisualEditor();
    });

    block.querySelector('.anime-editor-remove-season')?.addEventListener('click', () => {
      currentData.animes[animeIndex].seasons.splice(seasonIndex, 1);
      syncJsonFromState();
      renderVisualEditor();
    });

    const episodesWrap = block.querySelector('.anime-editor-episodes');
    (season?.episodes || []).forEach((episode, episodeIndex) => {
      episodesWrap?.appendChild(renderEpisodeEditor(animeIndex, seasonIndex, episodeIndex, episode));
    });

    return block;
  }

  function renderCollectionsVisual() {
    const host = byId('anime-editor-collections-visual');
    const textarea = byId('anime-editor-collections');
    if (!host || !textarea) return;

    host.innerHTML = '<h3 style="margin: 8px 0;">Coleções (Visual)</h3>';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Coleção';
    addBtn.addEventListener('click', () => {
      currentData.collections.push({ id: Date.now(), name: 'Nova Coleção', animeIds: [] });
      syncJsonFromState();
      renderCollectionsVisual();
    });
    host.appendChild(addBtn);

    (currentData.collections || []).forEach((collection, idx) => {
      const row = document.createElement('div');
      row.className = 'anime-editor-collection-row';
      row.innerHTML = `
        <div class="anime-editor-grid">
          <label>Nome <input type="text" class="collection-field" data-field="name" value="${toText(collection?.name || collection?.title)}"></label>
          <label>Descrição <input type="text" class="collection-field" data-field="description" value="${toText(collection?.description)}"></label>
          <label>Capa <input type="text" class="collection-field" data-field="thumbnail" value="${toText(collection?.thumbnail || collection?.cover)}"></label>
          <label>IDs dos Animes (vírgula) <input type="text" class="collection-field" data-field="animeIds" value="${toText((collection?.animeIds || collection?.animes || []).join(', '))}"></label>
        </div>
        <button type="button" class="btn btn-secondary anime-editor-remove-collection">Remover coleção</button>
      `;

      row.querySelectorAll('.collection-field').forEach((input) => {
        input.addEventListener('input', () => {
          const current = currentData.collections[idx];
          current.name = row.querySelector('[data-field="name"]')?.value || '';
          current.description = row.querySelector('[data-field="description"]')?.value || '';
          current.thumbnail = row.querySelector('[data-field="thumbnail"]')?.value || '';
          const ids = (row.querySelector('[data-field="animeIds"]')?.value || '').split(',').map(v => Number(v.trim())).filter(v => Number.isFinite(v));
          current.animeIds = ids;
          syncJsonFromState();
        });
      });

      row.querySelector('.anime-editor-remove-collection')?.addEventListener('click', () => {
        currentData.collections.splice(idx, 1);
        syncJsonFromState();
        renderCollectionsVisual();
      });

      host.appendChild(row);
    });
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
        <div class="anime-editor-card">
          <div class="anime-editor-grid">
            <label>Título <input type="text" class="anime-field" data-field="title" value="${toText(anime.title || anime.name)}"></label>
            <label>Tipo <input type="text" class="anime-field" data-field="type" value="${toText(anime.type || 'anime')}"></label>
            <label>Ano <input type="text" class="anime-field" data-field="year" value="${toText(inferYear(anime))}"></label>
            <label>Nota <input type="text" class="anime-field" data-field="rating" value="${toText(inferScore(anime))}"></label>
            <label>Thumbnail <input type="text" class="anime-field" data-field="thumbnail" value="${toText(anime.thumbnail)}"></label>
            <label>Cover <input type="text" class="anime-field" data-field="cover" value="${toText(anime.cover)}"></label>
            <label>Banner <input type="text" class="anime-field" data-field="banner" value="${toText(anime.banner)}"></label>
            <label>Trailer <input type="text" class="anime-field" data-field="trailer" value="${toText(anime.trailer)}"></label>
          </div>
          <label class="anime-editor-advanced-label">Descrição
            <textarea class="anime-field anime-editor-advanced" data-field="description">${toText(anime.description)}</textarea>
          </label>
          <label class="anime-editor-advanced-label">Gêneros (1 por linha)
            <textarea class="anime-field anime-editor-advanced" data-field="categories">${toText(toList(anime.categories).join('\n'))}</textarea>
          </label>
          <label class="anime-editor-advanced-label">Openings (1 URL por linha)
            <textarea class="anime-field anime-editor-advanced" data-field="openings">${toText(toList(anime.openings).join('\n'))}</textarea>
          </label>
          <label class="anime-editor-advanced-label">Endings (1 URL por linha)
            <textarea class="anime-field anime-editor-advanced" data-field="endings">${toText(toList(anime.endings).join('\n'))}</textarea>
          </label>
          <label class="anime-editor-advanced-label">OSTs (1 URL por linha)
            <textarea class="anime-field anime-editor-advanced" data-field="osts">${toText(toList(anime.osts).join('\n'))}</textarea>
          </label>
          <video class="anime-editor-video-preview" controls muted playsinline style="display:none"></video>
          <div class="anime-editor-seasons"></div>
          <div class="anime-editor-visual-actions">
            <button type="button" class="btn btn-primary anime-editor-add-season">+ Temporada</button>
          </div>
        </div>
      `;

      row.querySelector('.anime-editor-remove')?.addEventListener('click', () => {
        currentData.animes.splice(index, 1);
        syncJsonFromState();
        renderVisualEditor();
      });

      row.querySelectorAll('.anime-field').forEach((input) => {
        input.addEventListener('input', () => applyAnimeVisualFields(row, index));
      });

      row.querySelector('.anime-editor-add-season')?.addEventListener('click', () => {
        currentData.animes[index].seasons = Array.isArray(currentData.animes[index].seasons) ? currentData.animes[index].seasons : [];
        currentData.animes[index].seasons.push({ number: currentData.animes[index].seasons.length + 1, episodes: [] });
        syncJsonFromState();
        renderVisualEditor();
      });

      const seasonsWrap = row.querySelector('.anime-editor-seasons');
      const seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
      if (!Array.isArray(anime.seasons)) currentData.animes[index].seasons = seasons;
      seasons.forEach((season, seasonIndex) => {
        seasonsWrap?.appendChild(renderSeasonEditor(index, seasonIndex, season));
      });

      row.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(index));
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer?.getData('text/plain'));
        const to = index;
        if (Number.isNaN(from) || from === to) return;
        const moved = currentData.animes.splice(from, 1)[0];
        currentData.animes.splice(to, 0, moved);
        syncJsonFromState();
        renderVisualEditor();
      });

      list.appendChild(row);
    });

    renderCollectionsVisual();
  }

  function loadCurrentIntoEditor() {
    currentData = getCurrentPayload();
    syncJsonFromState();
    renderVisualEditor();
    setStatus('Dados atuais carregados no editor visual.');
  }

  function applyToSite() {
    try {
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
      setStatus('Alterações visuais aplicadas no site.');
      syncJsonFromState();
      renderVisualEditor();
    } catch (error) {
      setStatus(`Erro ao aplicar: ${error.message}`, true);
    }
  }

  function copyJson() {
    const payload = JSON.stringify(currentData, null, 2);
    navigator.clipboard.writeText(payload).then(() => {
      setStatus('JSON copiado.');
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
      setStatus('anime-data.json baixado.');
    } catch (error) {
      setStatus(`Erro ao baixar: ${error.message}`, true);
    }
  }

  function addAnime() {
    currentData.animes.push({
      id: Date.now(),
      title: 'Novo Anime',
      description: '',
      thumbnail: 'images/bg-default.jpg',
      cover: 'images/bg-default.jpg',
      banner: 'images/bg-default.jpg',
      trailer: '',
      type: 'anime',
      dateAdded: new Date().toISOString(),
      categories: [],
      seasons: [{ number: 1, episodes: [] }],
      year: '',
      rating: '',
      openings: [],
      endings: [],
      osts: []
    });
    syncJsonFromState();
    renderVisualEditor();
  }

  function closeModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function openModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadCurrentIntoEditor();
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

  function removePublicEditorButtons() {
    const shouldRemove = (el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      const hasEditorWords = text.includes('editor anime') || (text.includes('editor') && text.includes('anime')) || text === 'editar anime';
      const knownPublicId = id === 'open-anime-editor-btn' || id === 'editor-anime-btn';
      return hasEditorWords || knownPublicId || cls.includes('open-anime-editor-btn') || cls.includes('anime-editor-btn');
    };

    document.querySelectorAll('#open-anime-editor-btn, .open-anime-editor-btn, button, a').forEach((el) => {
      if (shouldRemove(el)) el.remove();
    });
  }

  function bindSecretTriggers() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'j') {
        requestAccessAndOpen();
      }
    });

  }

  function bind() {
    byId('close-anime-editor')?.addEventListener('click', closeModal);
    byId('anime-editor-load')?.addEventListener('click', loadCurrentIntoEditor);
    byId('anime-editor-format')?.addEventListener('click', syncStateFromJson);
    byId('anime-editor-apply')?.addEventListener('click', applyToSite);
    byId('anime-editor-copy')?.addEventListener('click', copyJson);
    byId('anime-editor-download')?.addEventListener('click', downloadJson);
    byId('anime-editor-add-anime')?.addEventListener('click', addAnime);
    byId('anime-editor-view-visual')?.addEventListener('click', () => {
      const visual = byId('anime-editor-visual');
      if (visual) visual.style.display = 'block';
      const raw = byId('anime-editor-textarea');
      if (raw) raw.style.display = 'none';
    });

    byId('anime-editor-collections')?.addEventListener('change', (e) => {
      try {
        currentData.collections = JSON.parse(e.target.value || '[]');
        syncJsonFromState();
        renderCollectionsVisual();
      } catch (error) {
        setStatus(`Coleções inválidas: ${error.message}`, true);
      }
    });

    window.addEventListener('click', (event) => {
      if (event.target === byId('anime-editor-modal')) closeModal();
    });

    removePublicEditorButtons();
    new MutationObserver(removePublicEditorButtons).observe(document.body, { childList: true, subtree: true });

    const raw = byId('anime-editor-textarea');
    if (raw) raw.style.display = 'none';

    bindSecretTriggers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
