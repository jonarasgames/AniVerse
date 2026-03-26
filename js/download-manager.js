/* js/download-manager.js - Offline downloads (episode/season/anime/collection/music) */
(function () {
  'use strict';

  const CACHE_NAME = 'aniverse-offline-v4';
  const STORAGE_KEY = 'aniverseOfflineDownloads';
  const progressState = new Map();
  const inFlight = new Set();
  const downloadQueue = [];
  const pausedDownloads = new Set();
  const downloadControllers = new Map();
  const STATUS = Object.freeze({
    QUEUED: 'queued',
    DOWNLOADING: 'downloading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error'
  });

  let activeDownload = null;

  function itemIdentity(item) {
    if (!item) return '';
    if (item.type === 'music') return `music|${normalizeMediaUrl(item.sourceUrl || '')}`;
    return `ep|${item.animeId}|${item.season}|${item.episode}`;
  }

  function dedupeDownloads(list) {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach(item => {
      if (!item || !item.sourceUrl) return;
      const id = itemIdentity(item);
      if (!id) return;
      const prev = map.get(id);
      map.set(id, prev && (prev.createdAt || 0) > (item.createdAt || 0) ? prev : item);
    });
    return Array.from(map.values());
  }

  function readDownloads() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const cleaned = dedupeDownloads(raw).map(item => ({
        ...item,
        status: [STATUS.QUEUED, STATUS.DOWNLOADING, STATUS.PAUSED, STATUS.COMPLETED, STATUS.ERROR].includes(item?.status)
          ? item.status
          : STATUS.COMPLETED
      })).map(item => (
        item.status === STATUS.DOWNLOADING || item.status === STATUS.QUEUED
          ? { ...item, status: STATUS.PAUSED }
          : item
      ));
      if (JSON.stringify(raw) !== JSON.stringify(cleaned)) saveDownloads(cleaned);
      return cleaned;
    } catch (_) {
      return [];
    }
  }

  function saveDownloads(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeDownloads(list)));
    } catch (_) {}
  }

  function upsertDownload(item) {
    const list = readDownloads();
    const id = itemIdentity(item);
    const idx = list.findIndex(x => itemIdentity(x) === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...item };
    else list.push(item);
    saveDownloads(list);
  }

  function removeDownload(item) {
    const id = itemIdentity(item);
    saveDownloads(readDownloads().filter(x => itemIdentity(x) !== id));
  }

  function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function setMusicStatus(text) {
    setStatus('mini-download-status', text);
  }

  function statusLabel(status) {
    switch (status) {
      case STATUS.QUEUED: return 'Na fila';
      case STATUS.DOWNLOADING: return 'Baixando';
      case STATUS.PAUSED: return 'Pausado';
      case STATUS.COMPLETED: return 'Concluído';
      case STATUS.ERROR: return 'Erro';
      default: return 'Sem status';
    }
  }

  function updateItemStatus(item, status, extras = {}) {
    if (!item) return;
    const next = { ...item, status, updatedAt: Date.now(), ...extras };
    upsertDownload(next);
  }

  function normalizeMediaUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (_) {
      return String(url);
    }
  }

  function canonicalMediaToken(url) {
    const normalized = normalizeMediaUrl(url);
    if (!normalized) return '';
    try {
      const parsed = new URL(normalized);
      return decodeURIComponent(`${parsed.pathname}`.replace(/\/+/, '/')).toLowerCase();
    } catch (_) {
      return decodeURIComponent(String(normalized).split('?')[0].split('#')[0]).toLowerCase();
    }
  }

  function mediaUrlMatches(urlA, urlB) {
    const a = normalizeMediaUrl(urlA);
    const b = normalizeMediaUrl(urlB);
    if (!a || !b) return false;
    if (a === b) return true;
    return canonicalMediaToken(a) === canonicalMediaToken(b);
  }

  function normalizeEpisodeSources(episode) {
    const helper = window.normalizeEpisodeSources;
    if (typeof helper === 'function') return helper(episode);
    const sources = [];
    if (Array.isArray(episode?.videoSources)) {
      episode.videoSources.forEach((source, idx) => {
        if (source?.url) sources.push({ url: source.url, label: source.label || `Fonte ${idx + 1}` });
      });
    } else if (episode?.videoUrl) {
      sources.push({ url: episode.videoUrl, label: 'Auto' });
    }
    return sources;
  }

  async function cacheBlob(url, blob) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob));
  }

  async function cacheResponse(url, response) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response);
  }

  async function isCached(url) {
    const cache = await caches.open(CACHE_NAME);
    return !!(await cache.match(url));
  }

  async function getCachedBlobUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  }

  async function removeCachedUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  }

  function xhrDownload(url, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }
      xhr.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.max(1, Math.min(99, Math.round((e.loaded / e.total) * 100)));
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response);
        reject(new Error(String(xhr.status)));
      };
      xhr.onerror = () => reject(new Error('network'));
      xhr.send();
    });
  }

  async function fetchWithProgress(url, onProgress, signal) {
    const response = await fetch(url, { mode: 'cors', signal });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body || !total) {
      onProgress(90);
      return await response.blob();
    }

    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      const pct = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)));
      onProgress(pct);
    }
    return new Blob(chunks);
  }

  async function downloadToCache(url, key, signal) {
    const pushProgress = pct => {
      progressState.set(key, pct);
      renderDownloadsSection();
    };

    try {
      const blob = await xhrDownload(url, pushProgress, signal);
      await cacheBlob(url, blob);
      progressState.set(key, 100);
      return;
    } catch (_) {}

    try {
      const blob = await fetchWithProgress(url, pushProgress, signal);
      await cacheBlob(url, blob);
      progressState.set(key, 100);
      return;
    } catch (_) {}

    // fallback for restrictive CORS endpoints
    const opaqueResp = await fetch(url, { mode: 'no-cors', signal });
    await cacheResponse(url, opaqueResp.clone());
    progressState.set(key, 100);
  }

  function currentEpisodeCtx() {
    const anime = window.currentAnime;
    const watching = window.currentWatchingAnime;
    if (!anime || !watching) return null;
    const seasonObj = anime.seasons?.find(s => s.number === watching.season);
    const episodeObj = seasonObj?.episodes?.[watching.episode - 1];
    if (!seasonObj || !episodeObj) return null;
    const source = normalizeEpisodeSources(episodeObj)[0];
    if (!source) return null;
    return { anime, watching, seasonObj, episodeObj, source };
  }

  function makeEpisodeItem(anime, seasonNumber, episodeIndex) {
    const season = anime.seasons?.find(s => s.number === seasonNumber);
    const epObj = season?.episodes?.[episodeIndex];
    if (!epObj) return null;
    const source = normalizeEpisodeSources(epObj)[0];
    if (!source) return null;
    const ep = episodeIndex + 1;
    return {
      key: `ep-${anime.id}-${seasonNumber}-${ep}`,
      type: 'episode',
      animeId: anime.id,
      animeTitle: anime.title,
      animeThumb: anime.thumbnail || anime.cover || 'images/bg-default.jpg',
      season: seasonNumber,
      episode: ep,
      label: epObj.title || `Episódio ${ep}`,
      sourceUrl: normalizeMediaUrl(source.url),
      status: STATUS.QUEUED,
      createdAt: Date.now()
    };
  }

  function makeMusicItem(track) {
    return {
      key: `music-${btoa(unescape(encodeURIComponent(track.url))).slice(0, 24)}`,
      type: 'music',
      animeTitle: track.anime || 'Música',
      animeThumb: track.cover || 'images/bg-default.jpg',
      label: `${track.title || 'Música'} • ${track.artist || 'Artista'}`,
      sourceUrl: normalizeMediaUrl(track.url),
      status: STATUS.QUEUED,
      createdAt: Date.now()
    };
  }

  async function queueDownload(item, statusId) {
    if (!item?.sourceUrl) return false;
    const id = itemIdentity(item);
    if (!id) return false;

    if (inFlight.has(id)) {
      setStatus(statusId, 'Já em download');
      return false;
    }

    const existing = readDownloads().find(x => itemIdentity(x) === id);
    if (existing && await isCached(existing.sourceUrl)) {
      setStatus(statusId, 'Já baixado');
      progressState.set(item.key, 100);
      updateItemStatus(existing, STATUS.COMPLETED);
      renderDownloadsSection();
      return true;
    }

    if (existing && !(await isCached(existing.sourceUrl))) {
      removeDownload(existing);
    }

    const queuedItem = { ...item, status: STATUS.QUEUED, sourceUrl: normalizeMediaUrl(item.sourceUrl) };
    upsertDownload(queuedItem);
    if (!downloadQueue.includes(id)) downloadQueue.push(id);
    progressState.set(item.key, 0);
    setStatus(statusId, 'Na fila');
    renderDownloadsSection();
    processQueue();
    return true;
  }

  async function processQueue() {
    if (activeDownload || !navigator.onLine) return;
    const nextId = downloadQueue.find(id => !pausedDownloads.has(id));
    if (!nextId) return;
    const item = readDownloads().find(entry => itemIdentity(entry) === nextId);
    if (!item) {
      const idx = downloadQueue.indexOf(nextId);
      if (idx >= 0) downloadQueue.splice(idx, 1);
      return processQueue();
    }
    await startDownload(item);
    processQueue();
  }

  async function startDownload(item) {
    const id = itemIdentity(item);
    if (!id) return false;
    if (activeDownload === id) return false;
    const controller = new AbortController();
    downloadControllers.set(id, controller);
    activeDownload = id;
    inFlight.add(id);
    updateItemStatus(item, STATUS.DOWNLOADING);
    if ((progressState.get(item.key) ?? 0) < 1) progressState.set(item.key, 1);
    renderDownloadsSection();

    const timer = setInterval(() => renderDownloadsSection(), 250);
    try {
      await downloadToCache(item.sourceUrl, item.key, controller.signal);
      progressState.set(item.key, 100);
      updateItemStatus(item, STATUS.COMPLETED);
      return true;
    } catch (err) {
      const isAbort = String(err?.name || '').toLowerCase() === 'aborterror';
      if (isAbort || pausedDownloads.has(id)) {
        updateItemStatus(item, STATUS.PAUSED);
      } else {
        updateItemStatus(item, STATUS.ERROR, { errorMessage: String(err?.message || 'Falha de rede') });
      }
      return false;
    } finally {
      clearInterval(timer);
      downloadControllers.delete(id);
      if (activeDownload === id) activeDownload = null;
      inFlight.delete(id);
      const idx = downloadQueue.indexOf(id);
      if (idx >= 0 && !pausedDownloads.has(id)) downloadQueue.splice(idx, 1);
      renderDownloadsSection();
    }
  }

  async function runBulk(items, statusId) {
    const valid = dedupeDownloads(items.filter(Boolean));
    if (!valid.length) return setStatus(statusId, 'Nada para baixar');
    let queued = 0;
    for (const item of valid) {
      const ok = await queueDownload(item, statusId);
      if (ok) queued += 1;
    }
    setStatus(statusId, `Na fila: ${queued}/${valid.length}`);
  }

  function pauseDownload(item) {
    const id = itemIdentity(item);
    if (!id) return;
    pausedDownloads.add(id);
    const controller = downloadControllers.get(id);
    if (controller) controller.abort();
    updateItemStatus(item, STATUS.PAUSED);
    renderDownloadsSection();
  }

  function resumeDownload(item) {
    const id = itemIdentity(item);
    if (!id) return;
    pausedDownloads.delete(id);
    if (!downloadQueue.includes(id)) downloadQueue.push(id);
    updateItemStatus(item, STATUS.QUEUED);
    renderDownloadsSection();
    processQueue();
  }

  async function downloadEpisode() {
    const ctx = currentEpisodeCtx();
    if (!ctx) return setStatus('download-episode-status', 'Nenhum episódio');
    await queueDownload(makeEpisodeItem(ctx.anime, ctx.watching.season, ctx.watching.episode - 1), 'download-episode-status');
  }

  async function downloadSeason() {
    const ctx = currentEpisodeCtx();
    if (!ctx) return setStatus('download-episode-status', 'Sem temporada');
    const items = (ctx.seasonObj.episodes || []).map((_, i) => makeEpisodeItem(ctx.anime, ctx.seasonObj.number, i));
    await runBulk(items, 'download-episode-status');
  }

  async function downloadAnime() {
    const ctx = currentEpisodeCtx();
    if (!ctx) return setStatus('download-episode-status', 'Sem anime');
    const items = [];
    (ctx.anime.seasons || []).forEach(s => (s.episodes || []).forEach((_, i) => items.push(makeEpisodeItem(ctx.anime, s.number, i))));
    await runBulk(items, 'download-episode-status');
  }

  async function downloadCollection() {
    const ctx = currentEpisodeCtx();
    if (!ctx || !window.animeDB?.getCollectionForAnime) return setStatus('download-episode-status', 'Sem coleção');
    const collection = window.animeDB.getCollectionForAnime(ctx.anime.id);
    if (!collection?.animeIds?.length) return setStatus('download-episode-status', 'Coleção vazia');

    const items = [];
    collection.animeIds.forEach(id => {
      const anime = window.animeDB.getAnimeById(id);
      (anime?.seasons || []).forEach(s => (s.episodes || []).forEach((_, i) => items.push(makeEpisodeItem(anime, s.number, i))));
    });

    await runBulk(items, 'download-episode-status');
  }

  async function downloadMusic() {
    const audio = document.getElementById('music-playing-audio');
    const card = document.querySelector('.music-card.playing');
    const src = card?.dataset.src || audio?.src || '';
    if (!src) return setMusicStatus('Toque uma música');

    const track = {
      url: normalizeMediaUrl(src),
      title: card?.dataset.title || document.getElementById('mini-player-title')?.textContent,
      artist: card?.dataset.artist || document.getElementById('mini-player-artist')?.textContent,
      cover: card?.dataset.thumb || document.getElementById('mini-player-thumb')?.src,
      anime: card?.closest('.music-section')?.querySelector('.music-anime-title')?.textContent || 'Música'
    };

    const ok = await queueDownload(makeMusicItem(track), 'mini-download-status');
    if (!ok) setMusicStatus(document.getElementById('mini-download-status')?.textContent || 'Falhou');
  }

  function getOfflineMaps() {
    const downloads = readDownloads();
    const epMap = new Map();
    const musicUrls = [];

    downloads.forEach(item => {
      if (item.type === 'music') {
        musicUrls.push(item.sourceUrl);
        return;
      }
      const animeId = Number(item.animeId);
      if (!epMap.has(animeId)) epMap.set(animeId, new Map());
      const seasonMap = epMap.get(animeId);
      if (!seasonMap.has(item.season)) seasonMap.set(item.season, new Set());
      seasonMap.get(item.season).add(item.episode);
    });

    return { epMap, musicUrls };
  }

  function applyOfflineModeFilters() {
    if (navigator.onLine || !window.animeDB) return;

    const { epMap, musicUrls } = getOfflineMaps();

    if (!window.__aniverseOriginalData) {
      window.__aniverseOriginalData = {
        animes: JSON.parse(JSON.stringify(window.animeDB.animes || [])),
        musicLibrary: JSON.parse(JSON.stringify(window.animeDB.musicLibrary || { themes: [], osts: {} })),
        collections: JSON.parse(JSON.stringify(window.animeDB.collections || []))
      };
    }

    const filteredAnimes = (window.__aniverseOriginalData.animes || []).map(anime => {
      const seasonsMap = epMap.get(Number(anime.id));
      if (!seasonsMap) return null;

      const seasons = (anime.seasons || []).map(season => {
        const epsSet = seasonsMap.get(season.number);
        if (!epsSet) return null;
        const episodes = (season.episodes || []).filter((_, idx) => epsSet.has(idx + 1));
        if (!episodes.length) return null;
        return { ...season, episodes };
      }).filter(Boolean);

      if (!seasons.length) return null;
      return { ...anime, seasons };
    }).filter(Boolean);

    window.animeDB.animes = filteredAnimes;

    const baseMusic = window.__aniverseOriginalData.musicLibrary || { themes: [], osts: {} };
    window.animeDB.musicLibrary = {
      ...baseMusic,
      themes: (baseMusic.themes || []).filter(track => musicUrls.some(url => mediaUrlMatches(url, track.audio)))
    };

    const availableAnimeIds = new Set(filteredAnimes.map(a => Number(a.id)));
    window.animeDB.collections = (window.__aniverseOriginalData.collections || []).filter(collection =>
      Array.isArray(collection?.animeIds) && collection.animeIds.some(id => availableAnimeIds.has(Number(id)))
    );
  }

  function clearOfflineFilters() {
    if (!window.__aniverseOriginalData || !window.animeDB) return;
    window.animeDB.animes = JSON.parse(JSON.stringify(window.__aniverseOriginalData.animes || []));
    window.animeDB.musicLibrary = JSON.parse(JSON.stringify(window.__aniverseOriginalData.musicLibrary || { themes: [], osts: {} }));
    window.animeDB.collections = JSON.parse(JSON.stringify(window.__aniverseOriginalData.collections || []));
  }

  async function playItem(item) {
    if (item.type === 'music') {
      const audio = document.getElementById('music-playing-audio');
      const blobUrl = await getCachedBlobUrl(item.sourceUrl);
      if (audio) {
        audio.src = blobUrl || item.sourceUrl;
        audio.play().catch(() => {});
      }
      return;
    }

    const anime = window.animeDB?.getAnimeById?.(item.animeId);
    if (!anime) return;
    window.openEpisode?.(anime, item.season, item.episode - 1);

    const player = document.getElementById('anime-player');
    const blobUrl = await getCachedBlobUrl(item.sourceUrl);
    if (!blobUrl && !navigator.onLine) {
      setStatus('download-episode-status', 'Arquivo offline indisponível');
      return;
    }
    if (player) {
      player.src = blobUrl || item.sourceUrl;
      player.load();
      player.play().catch(() => {});
    }
  }

  async function playDownloadedEpisodeFromContinue(item) {
    if (!item) return false;
    const match = readDownloads().find(d => (
      d.type !== 'music' &&
      Number(d.animeId) === Number(item.id || item.animeId) &&
      Number(d.season) === Number(item.season) &&
      Number(d.episode) === Number(item.episode)
    ));
    if (!match || !(await isCached(match.sourceUrl))) return false;
    await playItem(match);
    return true;
  }

  function progressBadge(item, cached) {
    const pct = progressState.get(item.key);
    const value = pct == null ? (cached ? 100 : 0) : pct;
    const status = item.status || (cached ? STATUS.COMPLETED : STATUS.QUEUED);
    const done = status === STATUS.COMPLETED || value >= 100;
    const statusClass = `status-${status}`.replace(/[^a-z0-9-_]/gi, '');
    const pctLabel = value > 0 && !done ? ` • ${value}%` : '';
    return `<span class="dl-pill ${done ? 'done' : ''} ${statusClass}">${statusLabel(status)}${pctLabel}</span>`;
  }

  async function requestSwMediaStats() {
    if (!('serviceWorker' in navigator)) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = registration?.active || navigator.serviceWorker.controller;
    if (!worker) return null;
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 800);
      channel.port1.onmessage = event => {
        clearTimeout(timeout);
        resolve(event.data || null);
      };
      worker.postMessage({ type: 'GET_MEDIA_CACHE_INFO' }, [channel.port2]);
    });
  }

  async function renderDownloadsSection() {
    const grid = document.getElementById('downloads-grid');
    const offlineBadge = document.getElementById('downloads-offline-status');
    const queueBadge = document.getElementById('downloads-queue-status');
    const swBadge = document.getElementById('downloads-sw-status');
    if (!grid) return;

    const allDownloads = readDownloads();
    const queuedCount = allDownloads.filter(item => item.status === STATUS.QUEUED).length;
    const downloadingCount = allDownloads.filter(item => item.status === STATUS.DOWNLOADING).length;
    const pausedCount = allDownloads.filter(item => item.status === STATUS.PAUSED).length;
    const errorCount = allDownloads.filter(item => item.status === STATUS.ERROR).length;

    if (offlineBadge) {
      offlineBadge.textContent = navigator.onLine ? 'Online: fila ativa' : 'Offline: downloads pausados';
      offlineBadge.classList.toggle('is-offline', !navigator.onLine);
    }
    if (queueBadge) {
      queueBadge.textContent = `Fila ${queuedCount} • Baixando ${downloadingCount} • Pausados ${pausedCount} • Erros ${errorCount}`;
    }
    if (swBadge) {
      swBadge.textContent = 'SW mídia: cache-first';
      requestSwMediaStats().then(stats => {
        if (!stats || !swBadge.isConnected) return;
        swBadge.textContent = `SW mídia: ${stats.entries || 0} itens em cache`;
      }).catch(() => {});
    }

    const list = allDownloads;
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p style="opacity:.8;padding:8px;">Sem downloads</p>';
      return;
    }

    for (const item of list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
      const cached = await isCached(item.sourceUrl);
      const pct = Math.max(0, Math.min(100, progressState.get(item.key) ?? (cached ? 100 : 0)));
      const card = document.createElement('div');
      card.className = 'download-card';
      card.innerHTML = `
        <img src="${item.animeThumb}" alt="${item.animeTitle}">
        <div class="download-info">
          <h4>${item.animeTitle} ${progressBadge(item, cached)}</h4>
          <p>${item.type === 'music' ? item.label : `T${item.season} • E${item.episode}`}</p>
          <div class="download-progress"><span style="width:${pct}%"></span></div>
          <small>${cached ? 'Arquivo offline disponível' : statusLabel(item.status || STATUS.QUEUED)}</small>
        </div>
        <div class="download-actions">
          <button class="btn btn-secondary dl-toggle">${item.status === STATUS.PAUSED ? '▶' : '⏸'}</button>
          <button class="btn btn-primary dl-play">▶</button>
          <button class="btn btn-secondary dl-remove">✕</button>
        </div>
      `;

      const toggleBtn = card.querySelector('.dl-toggle');
      const playBtn = card.querySelector('.dl-play');
      playBtn.disabled = !cached;
      toggleBtn.disabled = item.status === STATUS.COMPLETED || item.status === STATUS.ERROR;
      toggleBtn.addEventListener('click', () => {
        if (item.status === STATUS.PAUSED) resumeDownload(item);
        else pauseDownload(item);
      });
      playBtn.addEventListener('click', () => playItem(item));
      card.querySelector('.dl-remove').addEventListener('click', async () => {
        await removeCachedUrl(item.sourceUrl);
        pausedDownloads.delete(itemIdentity(item));
        const idx = downloadQueue.indexOf(itemIdentity(item));
        if (idx >= 0) downloadQueue.splice(idx, 1);
        const controller = downloadControllers.get(itemIdentity(item));
        if (controller) controller.abort();
        removeDownload(item);
        progressState.delete(item.key);
        renderDownloadsSection();
      });
      grid.appendChild(card);
    }
  }

  async function clearAllDownloads() {
    const list = readDownloads();
    for (const item of list) await removeCachedUrl(item.sourceUrl);
    downloadControllers.forEach(controller => controller.abort());
    downloadControllers.clear();
    downloadQueue.length = 0;
    pausedDownloads.clear();
    activeDownload = null;
    saveDownloads([]);
    progressState.clear();
    renderDownloadsSection();
    setStatus('download-episode-status', '');
    setMusicStatus('');
  }

  function filterContinueWatchingOffline(items) {
    if (navigator.onLine) return items;
    const list = readDownloads().filter(i => i.type !== 'music');
    if (!list.length) return [];

    const allowed = new Set(list.map(i => `${Number(i.animeId)}-${i.season}-${i.episode}`));
    return (items || []).filter(item => allowed.has(`${Number(item.id || item.animeId)}-${item.season}-${item.episode}`));
  }

  function refreshOfflineViews() {
    window.loadFullCatalog?.();
    window.loadNewReleases?.();
    window.renderMusicGrid?.();
    if (window.animeDB && typeof window.renderContinueWatchingGrid === 'function') {
      const list = window.animeDB.getContinueWatching();
      window.renderContinueWatchingGrid(list, 'continue-watching-grid');
      window.renderContinueWatchingGrid(list, 'continue-grid');
    }
  }

  function applyOfflineDataWrappers() {
    if (!window.__renderContinueWatchingGridOriginal && typeof window.renderContinueWatchingGrid === 'function') {
      window.__renderContinueWatchingGridOriginal = window.renderContinueWatchingGrid;
      window.renderContinueWatchingGrid = function (items, gridId) {
        return window.__renderContinueWatchingGridOriginal(filterContinueWatchingOffline(items), gridId);
      };
    }

    if (window.animeDB && !window.__offlineDataWrappersApplied) {
      window.__offlineDataWrappersApplied = true;

      const originalGetContinueWatching = window.animeDB.getContinueWatching?.bind(window.animeDB);
      if (originalGetContinueWatching) {
        window.animeDB.getContinueWatching = function () {
          const items = originalGetContinueWatching() || [];
          return filterContinueWatchingOffline(items);
        };
      }

      const originalGetCollections = window.animeDB.getCollections?.bind(window.animeDB);
      if (originalGetCollections) {
        window.animeDB.getCollections = function () {
          const collections = originalGetCollections() || [];
          if (navigator.onLine) return collections;
          const availableAnimeIds = new Set((window.animeDB.animes || []).map(a => Number(a.id)));
          return collections.filter(collection =>
            Array.isArray(collection?.animeIds) && collection.animeIds.some(id => availableAnimeIds.has(Number(id)))
          );
        };
      }
    }
  }

  function bindEvents() {
    document.getElementById('download-episode-btn')?.addEventListener('click', downloadEpisode);
    document.getElementById('download-season-btn')?.addEventListener('click', downloadSeason);
    document.getElementById('download-season-from-downloads-btn')?.addEventListener('click', downloadSeason);
    document.getElementById('download-anime-btn')?.addEventListener('click', downloadAnime);
    document.getElementById('download-collection-btn')?.addEventListener('click', downloadCollection);
    document.getElementById('clear-downloads-btn')?.addEventListener('click', () => confirm('Limpar downloads?') && clearAllDownloads());

    applyOfflineDataWrappers();

    window.addEventListener('online', () => {
      clearOfflineFilters();
      readDownloads().forEach(item => {
        if (item.status === STATUS.PAUSED && !pausedDownloads.has(itemIdentity(item))) {
          updateItemStatus(item, STATUS.QUEUED);
          if (!downloadQueue.includes(itemIdentity(item))) downloadQueue.push(itemIdentity(item));
        }
      });
      processQueue();
      refreshOfflineViews();
      renderDownloadsSection();
    });

    window.addEventListener('offline', () => {
      readDownloads().forEach(item => {
        if (item.status === STATUS.DOWNLOADING || item.status === STATUS.QUEUED) {
          pausedDownloads.add(itemIdentity(item));
          updateItemStatus(item, STATUS.PAUSED);
        }
      });
      downloadControllers.forEach(controller => controller.abort());
      applyOfflineModeFilters();
      refreshOfflineViews();
      renderDownloadsSection();
    });

    window.addEventListener('animeDataLoaded', () => {
      applyOfflineDataWrappers();
      applyOfflineModeFilters();
      renderDownloadsSection();
      if (!navigator.onLine) refreshOfflineViews();
    });

    applyOfflineModeFilters();
    renderDownloadsSection();
    processQueue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindEvents);
  else bindEvents();

  window.renderDownloadsSection = renderDownloadsSection;
  window.downloadCurrentMusic = downloadMusic;
  window.playDownloadedEpisodeFromContinue = playDownloadedEpisodeFromContinue;
})();
