/* js/download-manager.js - Offline download manager (Cache API + local metadata) */
(function () {
  'use strict';

  const CACHE_NAME = 'aniverse-offline-v1';
  const STORAGE_KEY = 'aniverseOfflineDownloads';

  function readDownloads() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = JSON.parse(raw || '[]');
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveDownloads(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function makeEpisodeKey(animeId, season, episode) {
    return `${animeId}-${season}-${episode}`;
  }

  function normalizeEpisodeSources(episode) {
    const out = [];
    if (!episode) return out;

    if (Array.isArray(episode.videoSources)) {
      episode.videoSources.forEach((source, idx) => {
        if (source?.url) out.push({ url: source.url, label: source.label || source.quality || `Fonte ${idx + 1}` });
      });
    }

    if (episode.videoQualities && typeof episode.videoQualities === 'object') {
      Object.entries(episode.videoQualities).forEach(([quality, url]) => {
        if (url) out.push({ url, label: quality || 'Fonte' });
      });
    }

    if (episode.videoUrl) {
      out.push({ url: episode.videoUrl, label: episode.videoQuality || 'Auto' });
    }

    const seen = new Set();
    return out.filter(item => item?.url && !seen.has(item.url) && seen.add(item.url));
  }

  async function cacheUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    let response;
    try {
      response = await fetch(url, { mode: 'cors' });
    } catch (_) {
      response = await fetch(url, { mode: 'no-cors' });
    }

    if (!response) throw new Error('Falha no download');
    await cache.put(url, response.clone());
    return true;
  }

  async function isCached(url) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  }

  async function getCachedBlobUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  }

  async function removeCachedUrl(url) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  }

  function getCurrentEpisodeData() {
    const anime = window.currentAnime;
    const watching = window.currentWatchingAnime;
    if (!anime || !watching) return null;

    const seasonObj = anime.seasons?.find(s => s.number === watching.season);
    const episodeObj = seasonObj?.episodes?.[watching.episode - 1];
    if (!seasonObj || !episodeObj) return null;

    const sources = normalizeEpisodeSources(episodeObj);
    if (!sources.length) return null;

    return {
      anime,
      watching,
      seasonObj,
      episodeObj,
      source: sources[0]
    };
  }

  async function downloadCurrentEpisode() {
    const data = getCurrentEpisodeData();
    const status = document.getElementById('download-episode-status');
    if (!data) {
      if (status) status.textContent = 'Nenhum episódio válido no player.';
      return;
    }

    const key = makeEpisodeKey(data.anime.id, data.watching.season, data.watching.episode);
    const list = readDownloads();
    if (list.some(item => item.key === key)) {
      if (status) status.textContent = 'Esse episódio já está baixado.';
      return;
    }

    if (status) status.textContent = 'Baixando para offline...';

    try {
      await cacheUrl(data.source.url);

      const item = {
        key,
        animeId: data.anime.id,
        animeTitle: data.anime.title,
        animeThumb: data.anime.thumbnail || data.anime.cover || 'images/bg-default.jpg',
        season: data.watching.season,
        episode: data.watching.episode,
        episodeTitle: data.episodeObj.title || `Episódio ${data.watching.episode}`,
        sourceUrl: data.source.url,
        createdAt: Date.now()
      };

      list.push(item);
      saveDownloads(list);
      if (status) status.textContent = 'Baixado com sucesso ✅';
      renderDownloadsSection();
    } catch (error) {
      if (status) status.textContent = 'Erro ao baixar esse episódio.';
    }
  }

  async function playDownload(item) {
    if (!item) return;

    const anime = window.animeDB?.getAnimeById?.(item.animeId);
    if (!anime) return;

    if (typeof window.openEpisode === 'function') {
      window.openEpisode(anime, item.season, item.episode - 1);
    }

    const blobUrl = await getCachedBlobUrl(item.sourceUrl);
    const player = document.getElementById('anime-player');
    if (player && blobUrl) {
      player.src = blobUrl;
      player.load();
      player.play().catch(() => {});
    }
  }

  async function removeDownload(item) {
    const list = readDownloads().filter(d => d.key !== item.key);
    saveDownloads(list);
    await removeCachedUrl(item.sourceUrl);
    renderDownloadsSection();
  }

  async function clearDownloads() {
    const list = readDownloads();
    for (const item of list) {
      await removeCachedUrl(item.sourceUrl);
    }
    saveDownloads([]);
    renderDownloadsSection();
  }

  async function renderDownloadsSection() {
    const grid = document.getElementById('downloads-grid');
    if (!grid) return;

    const list = readDownloads();
    grid.innerHTML = '';

    if (!list.length) {
      grid.innerHTML = '<p style="padding: 16px; opacity: .8;">Nenhum download salvo ainda.</p>';
      return;
    }

    for (const item of list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
      const cached = await isCached(item.sourceUrl);
      const card = document.createElement('div');
      card.className = 'download-card';
      card.innerHTML = `
        <img src="${item.animeThumb}" alt="${item.animeTitle}">
        <div class="download-info">
          <h4>${item.animeTitle}</h4>
          <p>T${item.season} • E${item.episode} — ${item.episodeTitle}</p>
          <small>${cached ? 'Disponível offline' : 'Arquivo ausente no cache'}</small>
        </div>
        <div class="download-actions">
          <button class="btn btn-primary download-play-btn">Assistir</button>
          <button class="btn btn-secondary download-remove-btn">Remover</button>
        </div>
      `;

      card.querySelector('.download-play-btn').addEventListener('click', () => playDownload(item));
      card.querySelector('.download-remove-btn').addEventListener('click', () => removeDownload(item));
      grid.appendChild(card);
    }
  }

  function bindEvents() {
    const btn = document.getElementById('download-episode-btn');
    if (btn) btn.addEventListener('click', downloadCurrentEpisode);

    const clearBtn = document.getElementById('clear-downloads-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Remover todos os downloads offline?')) {
          clearDownloads();
        }
      });
    }

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
