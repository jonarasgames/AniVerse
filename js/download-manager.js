/* js/download-manager.js - Offline downloads (episode/season/anime/collection/music) */
(function () {
  'use strict';

  const CACHE_NAME = 'aniverse-offline-v3';
  const STORAGE_KEY = 'aniverseOfflineDownloads';
  const progressState = new Map();
  const inFlight = new Set();

  function itemIdentity(item) {
    if (!item) return '';
    if (item.type === 'music') return `music|${item.sourceUrl || ''}`;
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
      const cleaned = dedupeDownloads(raw);
      if ((raw || []).length !== cleaned.length) saveDownloads(cleaned);
      return cleaned;
    } catch (_) {
      return [];
    }
  }

  function saveDownloads(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeDownloads(list))); } catch (_) {}
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

  async function isReallyDownloaded(item) {
    if (!item?.sourceUrl) return false;
    const inList = readDownloads().some(x => itemIdentity(x) === itemIdentity(item));
    if (!inList) return false;
    return await isCached(item.sourceUrl);
  }

  function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function setMusicStatus(text) {
    setStatus('download-music-status', text);
    setStatus('mini-download-status', text);
  }

  function normalizeEpisodeSources(episode) {
    const out = [];
    if (!episode) return out;

    if (Array.isArray(episode.videoSources)) {
      episode.videoSources.forEach((src, idx) => src?.url && out.push({ url: src.url, label: src.label || src.quality || `Fonte ${idx + 1}` }));
    }
    if (episode.videoQualities && typeof episode.videoQualities === 'object') {
      Object.entries(episode.videoQualities).forEach(([q, url]) => url && out.push({ url, label: q || 'Auto' }));
    }
    if (episode.videoUrl) out.push({ url: episode.videoUrl, label: episode.videoQuality || 'Auto' });

    const seen = new Set();
    return out.filter(s => s?.url && !seen.has(s.url) && seen.add(s.url));
  }

  async function cacheBlob(url, blob) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob));
  }

  async function isCached(url) {
    const cache = await caches.open(CACHE_NAME);
    return !!(await cache.match(url));
  }

  async function getCachedBlobUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    return URL.createObjectURL(await match.blob());
  }

  async function removeCachedUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  }

  function xhrDownload(url, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(xhr.response) : reject(new Error(String(xhr.status)));
      xhr.onerror = () => reject(new Error('network'));
      xhr.send();
    });
  }

  async function downloadToCache(url, key) {
    try {
      const blob = await xhrDownload(url, pct => {
        progressState.set(key, pct);
        renderDownloadsSection();
      });
      await cacheBlob(url, blob);
      progressState.set(key, 100);
    } catch (_) {
      const blob = await (await fetch(url, { mode: 'cors' })).blob();
      await cacheBlob(url, blob);
      progressState.set(key, 100);
    }
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
      sourceUrl: source.url,
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
      sourceUrl: track.url,
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
      return true;
    }

    // registro fantasma sem arquivo em cache -> limpa e baixa de novo
    if (existing && !(await isCached(existing.sourceUrl))) {
      removeDownload(existing);
    }

    inFlight.add(id);
    progressState.set(item.key, 1);
    setStatus(statusId, '1%');
    renderDownloadsSection();

    try {
      await downloadToCache(item.sourceUrl, item.key);
      upsertDownload(item);
      setStatus(statusId, '100% ✅');
      return true;
    } catch (_) {
      setStatus(statusId, 'Falhou');
      return false;
    } finally {
      inFlight.delete(id);
      renderDownloadsSection();
    }
  }


  async function runBulk(items, statusId) {
    const valid = dedupeDownloads(items.filter(Boolean));
    if (!valid.length) return setStatus(statusId, 'Nada para baixar');
    let done = 0;
    for (const item of valid) {
      setStatus(statusId, `${done}/${valid.length}`);
      await queueDownload(item, statusId);
      done += 1;
      setStatus(statusId, `${done}/${valid.length}`);
    }
    setStatus(statusId, `Concluído ${done}/${valid.length}`);
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
    if (!collection) return setStatus('download-episode-status', 'Sem coleção');

    const items = [];
    (window.animeDB.getAnimesInCollection(collection.id) || []).forEach(anime => {
      (anime.seasons || []).forEach(s => (s.episodes || []).forEach((_, i) => items.push(makeEpisodeItem(anime, s.number, i))));
    });
    await runBulk(items, 'download-episode-status');
  }

  async function downloadMusic() {
    const audio = document.getElementById('music-playing-audio');
    if (!audio?.src) return setMusicStatus('Toque uma música');
    const track = {
      url: audio.src,
      title: document.getElementById('mini-player-title')?.textContent,
      artist: document.getElementById('mini-player-artist')?.textContent,
      cover: document.getElementById('mini-player-thumb')?.src,
      anime: 'Música'
    };
    await queueDownload(makeMusicItem(track), 'mini-download-status');
    setMusicStatus(document.getElementById('mini-download-status')?.textContent || '');
  }

  function getOfflineMaps() {
    const downloads = readDownloads();
    const epMap = new Map();
    const musicUrls = new Set();

    downloads.forEach(item => {
      if (item.type === 'music') {
        musicUrls.add(item.sourceUrl);
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
        musicLibrary: JSON.parse(JSON.stringify(window.animeDB.musicLibrary || { themes: [], osts: {} }))
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
      themes: (baseMusic.themes || []).filter(track => musicUrls.has(track.audio))
    };
  }

  function clearOfflineFilters() {
    if (!window.__aniverseOriginalData || !window.animeDB) return;
    window.animeDB.animes = JSON.parse(JSON.stringify(window.__aniverseOriginalData.animes || []));
    window.animeDB.musicLibrary = JSON.parse(JSON.stringify(window.__aniverseOriginalData.musicLibrary || { themes: [], osts: {} }));
  }

  async function playItem(item) {
    if (item.type === 'music') {
      const audio = document.getElementById('music-playing-audio');
      const blobUrl = await getCachedBlobUrl(item.sourceUrl);
      if (audio && blobUrl) {
        audio.src = blobUrl;
        audio.play().catch(() => {});
      }
      return;
    }

    const anime = window.animeDB?.getAnimeById?.(item.animeId);
    if (!anime) return;
    window.openEpisode?.(anime, item.season, item.episode - 1);

    const player = document.getElementById('anime-player');
    const blobUrl = await getCachedBlobUrl(item.sourceUrl);
    if (player && blobUrl) {
      player.src = blobUrl;
      player.load();
      player.play().catch(() => {});
    }
  }

  function progressBadge(item) {
    const pct = progressState.get(item.key);
    if (pct == null) return '';
    return `<span class="dl-pill ${pct >= 100 ? 'done' : ''}">${pct}%</span>`;
  }

  async function renderDownloadsSection() {
    const grid = document.getElementById('downloads-grid');
    if (!grid) return;
    const list = readDownloads();
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p style="opacity:.8;padding:8px;">Sem downloads</p>';
      return;
    }

    for (const item of list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
      const cached = await isCached(item.sourceUrl);
      const card = document.createElement('div');
      card.className = 'download-card';
      card.innerHTML = `
        <img src="${item.animeThumb}" alt="${item.animeTitle}">
        <div class="download-info">
          <h4>${item.animeTitle} ${progressBadge(item)}</h4>
          <p>${item.type === 'music' ? item.label : `T${item.season} • E${item.episode}`}</p>
          <div class="download-progress"><span style="width:${Math.max(0, Math.min(100, progressState.get(item.key) ?? (cached ? 100 : 0)))}%"></span></div>
          <small>${cached ? 'Offline' : 'Sem arquivo'}</small>
        </div>
        <div class="download-actions">
          <button class="btn btn-primary dl-play">▶</button>
          <button class="btn btn-secondary dl-remove">✕</button>
        </div>
      `;
      card.querySelector('.dl-play').addEventListener('click', () => playItem(item));
      card.querySelector('.dl-remove').addEventListener('click', async () => {
        await removeCachedUrl(item.sourceUrl);
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

  function bindEvents() {
    document.getElementById('download-episode-btn')?.addEventListener('click', downloadEpisode);
    document.getElementById('download-season-btn')?.addEventListener('click', downloadSeason);
    document.getElementById('download-anime-btn')?.addEventListener('click', downloadAnime);
    document.getElementById('download-collection-btn')?.addEventListener('click', downloadCollection);
    document.getElementById('download-current-music-btn')?.addEventListener('click', downloadMusic);
    document.getElementById('clear-downloads-btn')?.addEventListener('click', () => confirm('Limpar downloads?') && clearAllDownloads());

    if (!window.__renderContinueWatchingGridOriginal && typeof window.renderContinueWatchingGrid === 'function') {
      window.__renderContinueWatchingGridOriginal = window.renderContinueWatchingGrid;
      window.renderContinueWatchingGrid = function (items, gridId) {
        return window.__renderContinueWatchingGridOriginal(filterContinueWatchingOffline(items), gridId);
      };
    }

    window.addEventListener('online', () => {
      clearOfflineFilters();
      window.loadFullCatalog?.();
      window.loadNewReleases?.();
      window.renderMusicGrid?.();
      if (window.animeDB && typeof window.renderContinueWatchingGrid === 'function') {
        window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-watching-grid');
        window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-grid');
      }
    });

    window.addEventListener('offline', () => {
      applyOfflineModeFilters();
      window.loadFullCatalog?.();
      window.loadNewReleases?.();
      window.renderMusicGrid?.();
      if (window.animeDB && typeof window.renderContinueWatchingGrid === 'function') {
        window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-watching-grid');
        window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-grid');
      }
    });

    window.addEventListener('animeDataLoaded', () => {
      applyOfflineModeFilters();
      renderDownloadsSection();
      if (!navigator.onLine) {
        window.loadFullCatalog?.();
        window.loadNewReleases?.();
        window.renderMusicGrid?.();
        if (window.animeDB && typeof window.renderContinueWatchingGrid === 'function') {
          window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-watching-grid');
          window.renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-grid');
        }
      }
    });

    applyOfflineModeFilters();
    renderDownloadsSection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindEvents);
  else bindEvents();

  window.renderDownloadsSection = renderDownloadsSection;
  window.downloadCurrentMusic = downloadMusic;
})();
