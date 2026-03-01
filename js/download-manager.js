/* js/download-manager.js - Offline downloads (episodes + music + bulk) */
(function () {
  'use strict';

  const CACHE_NAME = 'aniverse-offline-v2';
  const STORAGE_KEY = 'aniverseOfflineDownloads';
  const progressState = new Map();

  function readDownloads() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function saveDownloads(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function upsertDownload(item) {
    const list = readDownloads();
    const idx = list.findIndex(x => x.key === item.key);
    if (idx >= 0) list[idx] = { ...list[idx], ...item };
    else list.push(item);
    saveDownloads(list);
  }

  function removeDownloadByKey(key) {
    saveDownloads(readDownloads().filter(item => item.key !== key));
  }

  function normalizeEpisodeSources(episode) {
    const out = [];
    if (!episode) return out;

    if (Array.isArray(episode.videoSources)) {
      episode.videoSources.forEach((src, idx) => {
        if (src?.url) out.push({ url: src.url, label: src.label || src.quality || `Fonte ${idx + 1}` });
      });
    }

    if (episode.videoQualities && typeof episode.videoQualities === 'object') {
      Object.entries(episode.videoQualities).forEach(([quality, url]) => {
        if (url) out.push({ url, label: quality || 'Auto' });
      });
    }

    if (episode.videoUrl) out.push({ url: episode.videoUrl, label: episode.videoQuality || 'Auto' });

    const seen = new Set();
    return out.filter(item => item?.url && !seen.has(item.url) && seen.add(item.url));
  }

  function getCurrentEpisodeData() {
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

  function setInlineStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  async function cacheBlob(url, blob) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob));
  }

  function downloadWithProgress(url, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
          onProgress(pct);
        } else {
          onProgress(null);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Erro de rede'));
      xhr.send();
    });
  }

  async function cacheUrlWithProgress(url, key) {
    try {
      const blob = await downloadWithProgress(url, pct => {
        progressState.set(key, pct);
        renderDownloadsSection();
      });
      await cacheBlob(url, blob);
      progressState.set(key, 100);
      return true;
    } catch (_) {
      // fallback sem progresso
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      await cacheBlob(url, blob);
      progressState.set(key, 100);
      return true;
    }
  }

  async function isCached(url) {
    const cache = await caches.open(CACHE_NAME);
    return !!(await cache.match(url));
  }

  async function removeCachedUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  }

  async function getCachedBlobUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    return URL.createObjectURL(await match.blob());
  }

  function makeEpisodeItem(anime, seasonNumber, episodeIndex) {
    const seasonObj = anime.seasons?.find(s => s.number === seasonNumber);
    const episodeObj = seasonObj?.episodes?.[episodeIndex];
    if (!episodeObj) return null;

    const source = normalizeEpisodeSources(episodeObj)[0];
    if (!source) return null;

    const ep = episodeIndex + 1;
    const key = `ep-${anime.id}-${seasonNumber}-${ep}`;
    return {
      key,
      type: 'episode',
      animeId: anime.id,
      animeTitle: anime.title,
      animeThumb: anime.thumbnail || anime.cover || 'images/bg-default.jpg',
      season: seasonNumber,
      episode: ep,
      episodeTitle: episodeObj.title || `Episódio ${ep}`,
      sourceUrl: source.url,
      createdAt: Date.now()
    };
  }

  function makeMusicItem(track) {
    const key = `music-${btoa(unescape(encodeURIComponent(track.url))).slice(0, 24)}`;
    return {
      key,
      type: 'music',
      animeTitle: track.anime || 'Música',
      animeThumb: track.cover || 'images/bg-default.jpg',
      episodeTitle: `${track.title || 'Música'} • ${track.artist || 'Artista'}`,
      sourceUrl: track.url,
      createdAt: Date.now()
    };
  }

  async function downloadItem(item, statusId) {
    if (!item?.sourceUrl) return false;

    const exists = readDownloads().some(d => d.key === item.key);
    if (exists) {
      setInlineStatus(statusId, 'Já baixado');
      return true;
    }

    setInlineStatus(statusId, '0%');
    progressState.set(item.key, 0);
    renderDownloadsSection();

    try {
      await cacheUrlWithProgress(item.sourceUrl, item.key);
      upsertDownload(item);
      setInlineStatus(statusId, '100% ✅');
      renderDownloadsSection();
      return true;
    } catch (_) {
      setInlineStatus(statusId, 'Falhou');
      progressState.delete(item.key);
      renderDownloadsSection();
      return false;
    }
  }

  async function runBulk(items, statusId) {
    const valid = items.filter(Boolean);
    if (!valid.length) {
      setInlineStatus(statusId, 'Nada para baixar');
      return;
    }

    let done = 0;
    for (const item of valid) {
      setInlineStatus(statusId, `${done}/${valid.length}`);
      await downloadItem(item, statusId);
      done += 1;
      setInlineStatus(statusId, `${done}/${valid.length}`);
    }
    setInlineStatus(statusId, `Concluído ${done}/${valid.length}`);
  }

  async function downloadCurrentEpisode() {
    const data = getCurrentEpisodeData();
    if (!data) return setInlineStatus('download-episode-status', 'Nenhum episódio');
    const item = makeEpisodeItem(data.anime, data.watching.season, data.watching.episode - 1);
    await downloadItem(item, 'download-episode-status');
  }

  async function downloadCurrentSeason() {
    const data = getCurrentEpisodeData();
    if (!data) return setInlineStatus('download-episode-status', 'Nenhuma temporada');
    const season = data.seasonObj;
    const items = (season.episodes || []).map((_, idx) => makeEpisodeItem(data.anime, season.number, idx));
    await runBulk(items, 'download-episode-status');
  }

  async function downloadCurrentAnime() {
    const data = getCurrentEpisodeData();
    if (!data) return setInlineStatus('download-episode-status', 'Nenhum anime');
    const items = [];
    (data.anime.seasons || []).forEach(season => {
      (season.episodes || []).forEach((_, idx) => items.push(makeEpisodeItem(data.anime, season.number, idx)));
    });
    await runBulk(items, 'download-episode-status');
  }

  async function downloadCurrentCollection() {
    const data = getCurrentEpisodeData();
    if (!data || !window.animeDB) return setInlineStatus('download-episode-status', 'Sem coleção');
    const collection = window.animeDB.getCollectionForAnime?.(data.anime.id);
    if (!collection) return setInlineStatus('download-episode-status', 'Sem coleção');

    const items = [];
    const animes = window.animeDB.getAnimesInCollection?.(collection.id) || [];
    animes.forEach(anime => {
      (anime.seasons || []).forEach(season => {
        (season.episodes || []).forEach((_, idx) => items.push(makeEpisodeItem(anime, season.number, idx)));
      });
    });

    await runBulk(items, 'download-episode-status');
  }

  async function downloadCurrentMusic() {
    const audio = document.getElementById('music-playing-audio');
    const url = audio?.src;
    const title = document.getElementById('mini-player-title')?.textContent || 'Música';
    const artist = document.getElementById('mini-player-artist')?.textContent || 'Artista';
    const cover = document.getElementById('mini-player-thumb')?.src || 'images/bg-default.jpg';

    if (!url) return setInlineStatus('download-music-status', 'Toque uma música');

    const item = makeMusicItem({ url, title, artist, cover, anime: 'Música' });
    await downloadItem(item, 'download-music-status');
  }

  async function playDownload(item) {
    if (item.type === 'music') {
      const blobUrl = await getCachedBlobUrl(item.sourceUrl);
      const audio = document.getElementById('music-playing-audio');
      if (!audio || !blobUrl) return;
      audio.src = blobUrl;
      audio.play().catch(() => {});
      return;
    }

    const anime = window.animeDB?.getAnimeById?.(item.animeId);
    if (!anime) return;
    if (typeof window.openEpisode === 'function') window.openEpisode(anime, item.season, item.episode - 1);

    const blobUrl = await getCachedBlobUrl(item.sourceUrl);
    const player = document.getElementById('anime-player');
    if (player && blobUrl) {
      player.src = blobUrl;
      player.load();
      player.play().catch(() => {});
    }
  }

  async function removeDownload(item) {
    await removeCachedUrl(item.sourceUrl);
    removeDownloadByKey(item.key);
    progressState.delete(item.key);
    renderDownloadsSection();
  }

  async function clearDownloads() {
    const list = readDownloads();
    for (const item of list) await removeCachedUrl(item.sourceUrl);
    saveDownloads([]);
    progressState.clear();
    setInlineStatus('download-episode-status', '');
    setInlineStatus('download-music-status', '');
    renderDownloadsSection();
  }

  function renderProgressBadge(item) {
    const pct = progressState.get(item.key);
    if (pct == null) return '';
    if (pct === 100) return '<span class="dl-pill done">100%</span>';
    return `<span class="dl-pill">${pct ?? 0}%</span>`;
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
          <h4>${item.animeTitle} ${renderProgressBadge(item)}</h4>
          <p>${item.type === 'music' ? item.episodeTitle : `T${item.season} • E${item.episode}`}</p>
          <small>${cached ? 'Offline' : 'Arquivo não encontrado'}</small>
        </div>
        <div class="download-actions">
          <button class="btn btn-primary download-play-btn">▶</button>
          <button class="btn btn-secondary download-remove-btn">✕</button>
        </div>
      `;
      card.querySelector('.download-play-btn').addEventListener('click', () => playDownload(item));
      card.querySelector('.download-remove-btn').addEventListener('click', () => removeDownload(item));
      grid.appendChild(card);
    }
  }

  function bindEvents() {
    document.getElementById('download-episode-btn')?.addEventListener('click', downloadCurrentEpisode);
    document.getElementById('download-season-btn')?.addEventListener('click', downloadCurrentSeason);
    document.getElementById('download-anime-btn')?.addEventListener('click', downloadCurrentAnime);
    document.getElementById('download-collection-btn')?.addEventListener('click', downloadCurrentCollection);
    document.getElementById('download-current-music-btn')?.addEventListener('click', downloadCurrentMusic);

    document.getElementById('clear-downloads-btn')?.addEventListener('click', () => {
      if (confirm('Limpar downloads?')) clearDownloads();
    });

    window.addEventListener('animeDataLoaded', renderDownloadsSection);
    renderDownloadsSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  window.renderDownloadsSection = renderDownloadsSection;
})();
