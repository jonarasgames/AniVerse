/* js/script.js - core fixes: avoid videoLoadTimeout ReferenceError, onVideoSetSource, openEpisode, animeDataLoaded binds */
let videoLoadTimeout = null;

// Dark mode initialization and handling
(function() {
  // Check for saved preference or system preference
  function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (savedMode === 'enabled') {
      document.body.classList.add('dark-mode');
      updateDarkModeIcon(true);
    } else if (savedMode === 'disabled') {
      document.body.classList.remove('dark-mode');
      updateDarkModeIcon(false);
    } else {
      // No saved preference, use system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
      }
    }
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('darkMode')) {
          if (e.matches) {
            document.body.classList.add('dark-mode');
            updateDarkModeIcon(true);
          } else {
            document.body.classList.remove('dark-mode');
            updateDarkModeIcon(false);
          }
        }
      });
    }
    
    // Toggle button handler
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        updateDarkModeIcon(isDark);
      });
    }
  }
  
  function updateDarkModeIcon(isDark) {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;
    const icon = toggle.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
  
  // Initialize immediately (don't wait for DOMContentLoaded to avoid flash)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Navigation handling
  const navLinks = document.querySelectorAll('nav a[data-section]');
  const sections = document.querySelectorAll('.content-section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.dataset.section;
      
      // Remove active class from all links and sections
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      // Show corresponding section
      const targetSection = document.getElementById(sectionId + '-section');
      if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        if (sectionId === 'animes' && typeof loadAnimeSection === 'function') {
          loadAnimeSection('anime');
        } else if (sectionId === 'movies' && typeof loadAnimeSection === 'function') {
          loadAnimeSection('movie');
        } else if (sectionId === 'ovas' && typeof loadAnimeSection === 'function') {
          loadAnimeSection('ova');
        } else if (sectionId === 'collections' && typeof loadCollections === 'function') {
          loadCollections();
        } else if (sectionId === 'openings' && typeof renderMusicLibrary === 'function' && window.animeDB) {
          renderMusicLibrary(window.animeDB.musicLibrary);
        } else if (sectionId === 'continue' && typeof renderContinueWatchingGrid === 'function' && window.animeDB) {
          renderContinueWatchingGrid(window.animeDB.getContinueWatching(), 'continue-grid');
        }
      }
    });
  });
  
  // Safe bindings
  const clearBtn = document.getElementById('clear-history');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Apagar histÃ³rico de continuar assistindo?')) return;
      try { localStorage.removeItem('continueWatching'); localStorage.removeItem('watchedEpisodes'); } catch(e){}
      if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(), 'continue-watching-grid');
      alert('HistÃ³rico apagado.');
    });
  }
  
  // Clear history button 2 (in continue section)
  const clearBtn2 = document.getElementById('clear-history-btn-2');
  if (clearBtn2) {
    clearBtn2.addEventListener('click', () => {
      if (!confirm('Apagar histÃ³rico de continuar assistindo?')) return;
      try { localStorage.removeItem('continueWatching'); localStorage.removeItem('watchedEpisodes'); } catch(e){}
      if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(), 'continue-grid');
      alert('HistÃ³rico apagado.');
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const NEWS_DATA_URL = 'news-data.json';
  const NEWS_LAST_SEEN_KEY = 'aniVerseNewsLastSeen';
  const NEWS_TOAST_KEY = 'aniVerseNewsToastSeen';
  const NEWS_ADMIN_PIN = 'rafaaxprs';
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const newsFab = document.getElementById('news-fab');
  const newsModal = document.getElementById('news-modal');
  const closeNewsModal = document.getElementById('close-news-modal');
  const newsList = document.getElementById('news-list');
  const newsLink = document.querySelector('.news-link');
  const newsAdminPanel = document.getElementById('news-admin-panel');
  const newsAdminActions = document.getElementById('news-admin-actions');
  const newsAdminToggle = document.getElementById('news-admin-toggle');
  const newsAdminLogout = document.getElementById('news-admin-logout');
  const newsForm = document.getElementById('news-form');
  const newsTitle = document.getElementById('news-title');
  const newsMessage = document.getElementById('news-message');
  const newsImageUrl = document.getElementById('news-image-url');
  const newsImageFile = document.getElementById('news-image-file');
  const newsFormClear = document.getElementById('news-form-clear');
  const newsDownloadJson = document.getElementById('news-download-json');
  const newsFormatting = document.querySelector('.news-formatting');
  const newsDot = newsFab ? newsFab.querySelector('.news-fab-dot') : null;
  let newsToast = null;

  if (!newsModal || !newsList || !newsForm || !newsFab) return;

  let newsItems = [];
  let adminEnabled = false;

  async function loadNewsItems() {
    try {
      const response = await fetch(NEWS_DATA_URL, { cache: 'no-store' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function setNewsItems(items) {
    newsItems = Array.isArray(items) ? items : [];
  }

  function getLatestItem(items) {
    return items.reduce((latest, item) => {
      if (!latest) return item;
      return new Date(item.createdAt).getTime() > new Date(latest.createdAt).getTime() ? item : latest;
    }, null);
  }

  function isRecent(item) {
    if (!item || !item.createdAt) return false;
    const createdAt = new Date(item.createdAt).getTime();
    if (Number.isNaN(createdAt)) return false;
    const ageMs = Math.max(0, Date.now() - createdAt);
    return ageMs <= ONE_WEEK_MS;
  }

  function isAdmin() {
    return adminEnabled;
  }

  function setAdmin(enabled) {
    adminEnabled = enabled;
    updateAdminUI();
  }

  function promptAdminAccess() {
    const pin = prompt('Digite o PIN para acessar o modo admin:');
    if (!pin) return;
    if (pin === NEWS_ADMIN_PIN) {
      setAdmin(true);
      renderNews();
      return;
    }
    alert('PIN incorreto.');
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function downloadNewsJsonFile(items) {
    const payload = JSON.stringify(items, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'news-data.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function updateAdminUI() {
    const adminActive = isAdmin();
    if (newsAdminPanel) newsAdminPanel.style.display = adminActive ? 'block' : 'none';
    if (newsAdminActions) newsAdminActions.style.display = adminActive ? 'flex' : 'none';
  }

  function updateFabVisibility(items) {
    const latest = getLatestItem(items);
    const shouldShow = isRecent(latest);
    newsFab.style.display = shouldShow ? 'flex' : 'none';
    if (!latest || !newsDot) return;
    const lastSeen = localStorage.getItem(NEWS_LAST_SEEN_KEY);
    const hasNew = !lastSeen || new Date(latest.createdAt).getTime() > new Date(lastSeen).getTime();
    newsDot.style.display = shouldShow && hasNew ? 'block' : 'none';
    updateNewsToast(latest, shouldShow && hasNew);
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatNewsMessage(message) {
    const safe = escapeHtml(message || '');
    const withLineBreaks = safe.replace(/\n/g, '<br>');
    return withLineBreaks
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function updateNewsToast(latest, shouldShow) {
    if (!latest || !shouldShow) {
      if (newsToast) newsToast.style.display = 'none';
      return;
    }

    if (!newsToast) {
      newsToast = document.createElement('div');
      newsToast.className = 'news-toast';
      newsToast.innerHTML = `
        <span>Tem novidade nova no AniVerse.</span>
        <button type="button">Ver agora</button>
      `;
      document.body.appendChild(newsToast);
      const button = newsToast.querySelector('button');
      if (button) {
        button.addEventListener('click', () => {
          openNewsModal();
          newsToast.style.display = 'none';
          localStorage.setItem(NEWS_TOAST_KEY, 'true');
        });
      }
    }

    if (localStorage.getItem(NEWS_TOAST_KEY) === 'true') {
      newsToast.style.display = 'none';
      return;
    }

    newsToast.style.display = 'flex';
  }

  function renderNews() {
    newsList.innerHTML = '';
    if (!newsItems.length) {
      newsList.innerHTML = '<p>Nenhuma novidade publicada ainda.</p>';
      updateFabVisibility(newsItems);
      return;
    }

    newsItems
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        const createdAt = new Date(item.createdAt);
        const hasImage = Boolean(item.imageUrl);
        const header = document.createElement('div');
        header.className = 'news-card-header';
        header.innerHTML = `
          <div class="news-card-summary">
            ${hasImage ? `<img src="${item.imageUrl}" alt="${item.title}" class="news-card-thumb">` : ''}
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <time datetime="${item.createdAt}">${createdAt.toLocaleDateString('pt-BR')}</time>
            </div>
          </div>
          <button type="button" class="news-card-toggle">Ver</button>
        `;

        const body = document.createElement('div');
        body.className = 'news-card-body';
        body.innerHTML = `
          <p>${formatNewsMessage(item.message)}</p>
          ${hasImage ? `<img src="${item.imageUrl}" alt="${item.title}" class="news-card-image">` : ''}
        `;

        header.addEventListener('click', () => {
          const isOpen = card.classList.toggle('is-open');
          const toggle = header.querySelector('.news-card-toggle');
          if (toggle) toggle.textContent = isOpen ? 'Fechar' : 'Ver';
        });

        card.appendChild(header);
        card.appendChild(body);

        if (isAdmin()) {
          const actions = document.createElement('div');
          actions.className = 'news-card-actions';
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-secondary';
          deleteBtn.textContent = 'Apagar';
          deleteBtn.addEventListener('click', () => {
            if (!confirm('Deseja apagar esta notÃ­cia?')) return;
            setNewsItems(newsItems.filter(news => news.id !== item.id));
            renderNews();
          });
          actions.appendChild(deleteBtn);
          card.appendChild(actions);
        }

        newsList.appendChild(card);
      });

    updateFabVisibility(newsItems);
  }

  function openNewsModal() {
    newsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const latest = getLatestItem(newsItems);
    if (latest) {
      localStorage.setItem(NEWS_LAST_SEEN_KEY, latest.createdAt);
      localStorage.removeItem(NEWS_TOAST_KEY);
      updateFabVisibility(newsItems);
    }
  }

  function closeModal() {
    newsModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (newsFab) {
    newsFab.addEventListener('click', openNewsModal);
  }
  if (newsLink) {
    newsLink.addEventListener('click', (event) => {
      event.preventDefault();
      openNewsModal();
    });
  }
  if (closeNewsModal) {
    closeNewsModal.addEventListener('click', closeModal);
  }

  window.addEventListener('click', (event) => {
    if (event.target === newsModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      promptAdminAccess();
    }
  });

  if (newsAdminToggle) {
    newsAdminToggle.addEventListener('click', () => {
      promptAdminAccess();
    });
  }

  if (newsAdminLogout) {
    newsAdminLogout.addEventListener('click', () => {
      setAdmin(false);
      renderNews();
    });
  }

  if (newsFormClear) {
    newsFormClear.addEventListener('click', () => {
      newsForm.reset();
    });
  }

  if (newsDownloadJson) {
    newsDownloadJson.addEventListener('click', () => {
      if (!isAdmin()) {
        alert('Acesso admin necessÃ¡rio.');
        return;
      }
      downloadNewsJsonFile(newsItems);
    });
  }

  if (newsForm) {
    newsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!isAdmin()) {
        alert('Acesso admin necessÃ¡rio.');
        return;
      }

      const title = newsTitle.value.trim();
      const message = newsMessage.value.trim();
      if (!title || !message) return;

      let imageUrl = newsImageUrl.value.trim();
      if (newsImageFile.files && newsImageFile.files[0]) {
        try {
          imageUrl = await readFileAsDataURL(newsImageFile.files[0]);
        } catch (error) {
          alert('Falha ao ler a imagem.');
        }
      }

      setNewsItems([
        {
          id: `${Date.now()}`,
          title,
          message,
          imageUrl,
          createdAt: new Date().toISOString()
        },
        ...newsItems
      ]);
      newsForm.reset();
      renderNews();
    });
  }

  function insertAtCursor(textarea, value) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = `${before}${value}${after}`;
    const caret = start + value.length;
    textarea.setSelectionRange(caret, caret);
    textarea.focus();
  }

  if (newsFormatting && newsMessage) {
    newsFormatting.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-format]');
      if (!button) return;
      const format = button.dataset.format;
      switch (format) {
        case 'bold':
          insertAtCursor(newsMessage, '**texto**');
          break;
        case 'italic':
          insertAtCursor(newsMessage, '*texto*');
          break;
        case 'list':
          insertAtCursor(newsMessage, '\n- item 1\n- item 2');
          break;
        case 'link':
          insertAtCursor(newsMessage, '[texto](https://exemplo.com)');
          break;
        case 'break':
          insertAtCursor(newsMessage, '\n');
          break;
      }
    });
  }

  if (window.location.hash === '#admin-news') {
    promptAdminAccess();
  }

  updateAdminUI();
  loadNewsItems().then(items => {
    setNewsItems(items);
    renderNews();
  });
});

// Video error helpers
function showVideoError(msg){
  let el = document.getElementById('video-error-container');
  if (!el){
    el = document.createElement('div'); el.id = 'video-error-container';
    Object.assign(el.style, { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,0.78)', color:'#fff', padding:'10px 14px', borderRadius:'8px', zIndex:100010, pointerEvents:'none' });
    (document.getElementById('video-player-container') || document.body).appendChild(el);
  }
  el.textContent = msg;
}
function clearVideoError(){ const el=document.getElementById('video-error-container'); if(el) el.remove(); }

function parseQualityRank(source){
  const raw = `${source.quality || source.label || ''}`;
  const match = raw.match(/(\d{3,4})/);
  if (match) return parseInt(match[1], 10);

  const lower = raw.toLowerCase();
  if (lower.includes('4k')) return 2160;
  if (lower.includes('fullhd')) return 1080;
  if (lower.includes('hd')) return 720;
  if (lower.includes('sd')) return 480;
  return 0;
}

function normalizeEpisodeSources(episode){
  const sources = [];
  if (!episode) return sources;

  if (Array.isArray(episode.videoSources)) {
    episode.videoSources.forEach((source, idx) => {
      if (source && source.url) {
        sources.push({
          url: source.url,
          label: source.label || source.quality || `Fonte ${idx + 1}`,
          rank: parseQualityRank(source)
        });
      }
    });
  }

  if (episode.videoQualities && typeof episode.videoQualities === 'object') {
    Object.entries(episode.videoQualities).forEach(([quality, url]) => {
      if (!url) return;
      sources.push({
        url,
        label: quality,
        rank: parseQualityRank({ quality })
      });
    });
  }

  if (episode.videoUrl) {
    sources.push({
      url: episode.videoUrl,
      label: episode.videoQuality || 'Auto',
      rank: parseQualityRank({ quality: episode.videoQuality || '' })
    });
  }

  const seen = new Set();
  const unique = sources.filter((source) => {
    if (!source || !source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });

  return unique.sort((a, b) => (b.rank || 0) - (a.rank || 0));
}

function addCacheBust(url){
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('_retry', String(Date.now()));
    return parsed.toString();
  } catch (_) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_retry=${Date.now()}`;
  }
}

function onVideoSetSource(player, episode){
  if (!player || !episode) return;

  if (player.__adaptiveCleanup) {
    try { player.__adaptiveCleanup(); } catch (_) {}
    player.__adaptiveCleanup = null;
  }

  const sources = normalizeEpisodeSources(episode);
  if (!sources.length) return;

  const state = {
    token: Date.now() + Math.random(),
    sources,
    currentIndex: 0,
    retriesInSource: 0,
    maxRetriesPerSource: 3,
    loadTimeoutMs: 15000,
    loadTimeoutId: null,
    retryTimeoutId: null,
    upgradeIntervalId: null,
    recoverInFlight: false,
    fallbackInUse: false
  };
  player.__adaptivePlayback = state;

  const clearTimers = () => {
    if (state.loadTimeoutId) {
      clearTimeout(state.loadTimeoutId);
      state.loadTimeoutId = null;
    }
    if (state.retryTimeoutId) {
      clearTimeout(state.retryTimeoutId);
      state.retryTimeoutId = null;
    }
  };

  const setLoadTimeout = () => {
    if (state.loadTimeoutId) clearTimeout(state.loadTimeoutId);
    state.loadTimeoutId = setTimeout(() => {
      recoverPlayback('timeout');
    }, state.loadTimeoutMs);
  };

  const setSource = (index, options = {}) => {
    const source = state.sources[index];
    if (!source || player.__adaptivePlayback?.token !== state.token) return;

    const shouldAutoPlay = options.autoPlay !== false;
    const preserveTime = Number.isFinite(options.preserveTime) ? options.preserveTime : 0;

    state.currentIndex = index;

    if (state.upgradeIntervalId && index === 0) {
      clearInterval(state.upgradeIntervalId);
      state.upgradeIntervalId = null;
      state.fallbackInUse = false;
    }

    let nextUrl = source.url;
    if (options.cacheBust) nextUrl = addCacheBust(nextUrl);

    if (videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout = null; }
    clearVideoError();

    player.src = nextUrl;
    player.load();

    if (preserveTime > 0) {
      player.addEventListener('loadedmetadata', () => {
        if (player.__adaptivePlayback?.token !== state.token) return;
        try { player.currentTime = preserveTime; } catch (_) {}
      }, { once: true });
    }

    setLoadTimeout();

    if (shouldAutoPlay) {
      player.play().catch(() => {});
    }
  };

  const tryBackgroundUpgrade = () => {
    if (state.currentIndex <= 0) return;
    if (state.upgradeIntervalId) return;

    state.upgradeIntervalId = setInterval(() => {
      if (player.__adaptivePlayback?.token !== state.token) return;
      const targetIndex = state.currentIndex - 1;
      const target = state.sources[targetIndex];
      if (!target) return;

      const probe = document.createElement('video');
      let settled = false;
      const cleanupProbe = () => {
        probe.removeAttribute('src');
        probe.load();
      };

      const success = () => {
        if (settled) return;
        settled = true;
        cleanupProbe();

        if (player.__adaptivePlayback?.token !== state.token) return;
        const resumeFrom = player.currentTime || 0;
        const wasPlaying = !player.paused;
        showVideoError(`Conexão estabilizada. Voltando para ${target.label || 'qualidade maior'}...`);
        setTimeout(clearVideoError, 1400);

        state.fallbackInUse = targetIndex > 0;
        state.retriesInSource = 0;
        setSource(targetIndex, { preserveTime: resumeFrom, autoPlay: wasPlaying, cacheBust: true });
      };

      const fail = () => {
        if (settled) return;
        settled = true;
        cleanupProbe();
      };

      probe.preload = 'metadata';
      probe.muted = true;
      probe.addEventListener('loadedmetadata', success, { once: true });
      probe.addEventListener('canplay', success, { once: true });
      probe.addEventListener('error', fail, { once: true });
      setTimeout(fail, 6000);
      probe.src = addCacheBust(target.url);
      probe.load();
    }, 30000);
  };

  const recoverPlayback = (reason) => {
    if (player.__adaptivePlayback?.token !== state.token || state.recoverInFlight) return;
    state.recoverInFlight = true;

    clearTimers();

    const timeSnapshot = player.currentTime || 0;

    if (state.retriesInSource < state.maxRetriesPerSource) {
      state.retriesInSource += 1;
      showVideoError(`Reconectando vídeo (${state.retriesInSource}/${state.maxRetriesPerSource})...`);
      state.retryTimeoutId = setTimeout(() => {
        state.recoverInFlight = false;
        setSource(state.currentIndex, { preserveTime: timeSnapshot, autoPlay: true, cacheBust: true });
      }, 700);
      return;
    }

    if (state.currentIndex < state.sources.length - 1) {
      const nextIndex = state.currentIndex + 1;
      const nextSource = state.sources[nextIndex];
      state.currentIndex = nextIndex;
      state.retriesInSource = 0;
      state.fallbackInUse = true;
      showVideoError(`Internet instável. Reproduzindo em ${nextSource.label || 'qualidade menor'} para evitar travamentos...`);
      state.retryTimeoutId = setTimeout(() => {
        state.recoverInFlight = false;
        setSource(nextIndex, { preserveTime: timeSnapshot, autoPlay: true, cacheBust: true });
      }, 900);
      return;
    }

    const reasonLabel = reason === 'timeout'
      ? 'carregamento excedeu o tempo limite'
      : 'houve falha na reprodução';
    showVideoError(`Não foi possível reproduzir agora (${reasonLabel}). Tente novamente em alguns instantes.`);
    state.recoverInFlight = false;
  };

  const handlePlaying = () => {
    if (player.__adaptivePlayback?.token !== state.token) return;
    clearTimers();
    clearVideoError();
    state.recoverInFlight = false;
    state.retriesInSource = 0;
    if (state.fallbackInUse) tryBackgroundUpgrade();
  };

  const handleCanPlay = () => {
    if (player.__adaptivePlayback?.token !== state.token) return;
    if (state.loadTimeoutId) {
      clearTimeout(state.loadTimeoutId);
      state.loadTimeoutId = null;
    }
  };

  const handleWaiting = () => {
    if (player.__adaptivePlayback?.token !== state.token) return;
    if (!state.fallbackInUse) return;
    showVideoError('Carregando... Ajustando qualidade automaticamente');
  };

  const handleError = () => {
    recoverPlayback('error');
  };

  player.addEventListener('playing', handlePlaying);
  player.addEventListener('canplay', handleCanPlay);
  player.addEventListener('waiting', handleWaiting);
  player.addEventListener('stalled', handleWaiting);
  player.addEventListener('error', handleError);

  player.__adaptiveCleanup = () => {
    clearTimers();
    if (state.upgradeIntervalId) {
      clearInterval(state.upgradeIntervalId);
      state.upgradeIntervalId = null;
    }
    player.removeEventListener('playing', handlePlaying);
    player.removeEventListener('canplay', handleCanPlay);
    player.removeEventListener('waiting', handleWaiting);
    player.removeEventListener('stalled', handleWaiting);
    player.removeEventListener('error', handleError);
  };

  setSource(0, { autoPlay: true, preserveTime: 0 });
}

// openEpisode helper: set src, resume, banner, opening
function openEpisode(anime, seasonNumber, episodeIndex){
  try {
    // PAUSAR MÚSICA SE ESTIVER TOCANDO
    const musicAudio = document.getElementById('music-playing-audio');
    if (musicAudio && !musicAudio.paused) {
        musicAudio.pause();
    }
    
    if (!anime) return;
    
    // GARANTIR QUE O MODAL DE VÍDEO SEJA EXIBIDO
    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
        videoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        window.dispatchEvent(new CustomEvent('videoModalVisibilityChanged', { detail: { open: true } }));
    }
    const videoContainer = document.getElementById('video-player-container');
    if (videoContainer) {
        if (!videoContainer.hasAttribute('tabindex')) {
            videoContainer.setAttribute('tabindex', '-1');
        }
        videoContainer.focus({ preventScroll: true });
    }
    
    const season = (anime.seasons || []).find(s => s.number === seasonNumber);
    const episode = season && Array.isArray(season.episodes) ? season.episodes[episodeIndex] : null;
    const player = document.getElementById('anime-player'); if (!player) return;
    if (episode){ onVideoSetSource(player, episode); }
    const bannerEl = document.querySelector('.video-banner'); const bannerUrl = anime.banner || anime.cover || 'images/bg-default.jpg';
    if (bannerEl) bannerEl.style.backgroundImage = `url('${bannerUrl}')`;
    if (episode && episode.opening && typeof episode.opening.start === 'number' && typeof episode.opening.end === 'number') window.updateOpeningData && window.updateOpeningData({ start: episode.opening.start, end: episode.opening.end }); else window.updateOpeningData && window.updateOpeningData(null);
    
    // Update age rating section
    const ageRatingSection = document.getElementById('age-rating-section');
    const ageRatingImage = document.getElementById('age-rating-image');
    const ageRatingContent = document.getElementById('age-rating-content');
    
    if (ageRatingSection && ageRatingImage && ageRatingContent) {
        if (anime.rating_age && window.AGE_RATING_IMAGES && window.AGE_RATING_IMAGES[anime.rating_age]) {
            ageRatingImage.src = window.AGE_RATING_IMAGES[anime.rating_age];
            ageRatingImage.alt = `Classificação ${anime.rating_age === 'L' ? 'Livre' : anime.rating_age + ' anos'}`;
            
            // Set content warnings
            if (anime.rating_content && anime.rating_content.length > 0) {
                ageRatingContent.textContent = anime.rating_content.join(' • ');
            } else {
                ageRatingContent.textContent = '';
            }
            
            ageRatingSection.classList.add('visible');
        } else {
            ageRatingSection.classList.remove('visible');
        }
    }
    
    // Try to restore playback position from profile's continue watching
    let resumeTime = 0;
    if (window.profileManager) {
        const activeProfile = window.profileManager.getActiveProfile();
        if (activeProfile && activeProfile.continueWatching) {
            const savedAnime = activeProfile.continueWatching.find(item => 
                item.animeId == anime.id && 
                item.season == seasonNumber && 
                item.episode == (episodeIndex + 1)
            );
            if (savedAnime && typeof savedAnime.currentTime === 'number') {
                resumeTime = savedAnime.currentTime;
            }
        }
    }
    
    // Update video title and description
    const titleEl = document.getElementById('video-title');
    const descEl = document.getElementById('video-description');
    if (titleEl) titleEl.textContent = anime.title || 'Título do Anime';
    if (descEl) descEl.textContent = anime.description || 'Descrição do anime...';
    
    // Determine season name (custom or default)
    const seasonName = season && season.name ? season.name : `Temporada ${seasonNumber}`;
    
    const sl = document.getElementById('current-season-label'), elb = document.getElementById('current-episode-label');
    if (sl) {
        sl.textContent = seasonName;
    }
    if (elb) elb.textContent = `Episódio ${episodeIndex+1}${episode && episode.title ? ' — '+episode.title : ''}`;
    syncEpisodeSelectors(anime, seasonNumber, episodeIndex);
    
    // Store anime info globally for progress updates and auto-advance
    window.currentAnime = anime; // Store full anime object for auto-advance
    window.currentWatchingAnime = {
        id: anime.id,
        title: anime.title,
        thumbnail: anime.thumbnail || anime.cover,
        season: seasonNumber,
        seasonName: seasonName,
        episode: episodeIndex + 1
    };
    window.dispatchEvent(new CustomEvent('episodeChanged', { detail: { animeId: anime.id, season: seasonNumber, episodeIndex } }));
    
    // Update video info overlay
    if (window.updateVideoOverlay) {
        window.updateVideoOverlay();
    }
    
    // Update collection indicator in player
    if (window.updateCollectionIndicator) {
        window.updateCollectionIndicator(anime.id);
    }
    
    // Save to active profile's continue watching with initial 0% progress
    if (window.profileManager) {
        const activeProfile = window.profileManager.getActiveProfile();
        if (activeProfile) {
            window.profileManager.updateContinueWatching(activeProfile.id, {
                animeId: anime.id,
                title: anime.title,
                thumbnail: anime.thumbnail || anime.cover,
                season: seasonNumber,
                episode: episodeIndex + 1,
                progress: 0,
                currentTime: resumeTime,
                timestamp: Date.now()
            });
        } else {
            console.warn('⚠️ Nenhum perfil ativo. Histórico NÃO salvo.');
        }
    }
    
    // Set resume time after metadata loads
    if (resumeTime > 0) {
        const setResumeTime = () => {
            try {
                player.currentTime = resumeTime;
                console.log(`▶️ Retomando em ${resumeTime.toFixed(1)}s`);
            } catch(e) {
                console.warn('Erro ao definir currentTime:', e);
            }
        };
        
        if (player.readyState >= 2) {
            setResumeTime();
        } else {
            player.addEventListener('loadedmetadata', setResumeTime, { once: true });
        }
    }
    
    player.play().catch(()=>{});
  } catch(e){ console.error('openEpisode error', e); }
}
window.openEpisode = openEpisode;

function getNextEpisodeTarget(){
  if (!window.currentAnime || !window.currentWatchingAnime) return null;

  const currentSeason = window.currentAnime.seasons?.find(s => s.number === window.currentWatchingAnime.season);
  if (currentSeason && currentSeason.episodes) {
    const nextEpisodeIndex = window.currentWatchingAnime.episode;
    if (nextEpisodeIndex < currentSeason.episodes.length) {
      return {
        anime: window.currentAnime,
        season: window.currentWatchingAnime.season,
        episodeIndex: nextEpisodeIndex,
        episode: currentSeason.episodes[nextEpisodeIndex]
      };
    }
  }

  const nextSeason = window.currentAnime?.seasons?.find(s => s.number === window.currentWatchingAnime.season + 1);
  if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
    return {
      anime: window.currentAnime,
      season: nextSeason.number,
      episodeIndex: 0,
      episode: nextSeason.episodes[0]
    };
  }

  return null;
}

function preloadNextEpisodeIfNeeded(player){
  if (!player || !window.currentWatchingAnime || !window.currentAnime || !Number.isFinite(player.duration) || player.duration <= 0) return;

  const remaining = player.duration - player.currentTime;
  if (remaining > 25) return;

  const target = getNextEpisodeTarget();
  if (!target || !target.episode) return;

  const preloadKey = `${target.anime.id}-${target.season}-${target.episodeIndex}`;
  if (window.__nextEpisodePreloadKey === preloadKey) return;

  const sources = normalizeEpisodeSources(target.episode);
  const best = sources[0];
  if (!best || !best.url) return;

  let preloader = window.__nextEpisodePreloader;
  if (!preloader) {
    preloader = document.createElement('video');
    preloader.id = 'next-episode-preloader';
    preloader.muted = true;
    preloader.preload = 'auto';
    preloader.playsInline = true;
    preloader.style.display = 'none';
    document.body.appendChild(preloader);
    window.__nextEpisodePreloader = preloader;
  }

  const currentOrigin = (() => {
    try { return new URL(player.currentSrc || player.src, window.location.href).origin; } catch (_) { return ''; }
  })();
  const nextOrigin = (() => {
    try { return new URL(best.url, window.location.href).origin; } catch (_) { return ''; }
  })();

  if (nextOrigin && nextOrigin !== currentOrigin && !document.querySelector(`link[data-next-preconnect="${nextOrigin}"]`)) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = nextOrigin;
    preconnect.crossOrigin = 'anonymous';
    preconnect.dataset.nextPreconnect = nextOrigin;
    document.head.appendChild(preconnect);
  }

  preloader.src = best.url;
  preloader.load();
  window.__nextEpisodePreloadKey = preloadKey;
  console.log(`⏭️ Pré-carregando próximo episódio: S${target.season}E${target.episodeIndex + 1}`);
}

// Update progress periodically while video is playing
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('anime-player');
  if (player) {
    let progressUpdateInterval = null;
    
    player.addEventListener('timeupdate', () => {
      preloadNextEpisodeIfNeeded(player);

      // Update progress every 5 seconds while playing
      if (!progressUpdateInterval && !player.paused) {
        progressUpdateInterval = setInterval(() => {
          if (window.currentWatchingAnime && window.profileManager && player.duration > 0) {
            const activeProfile = window.profileManager.getActiveProfile();
            if (activeProfile) {
              const progress = Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100));
              
              window.profileManager.updateContinueWatching(activeProfile.id, {
                animeId: window.currentWatchingAnime.id,
                title: window.currentWatchingAnime.title,
                thumbnail: window.currentWatchingAnime.thumbnail,
                season: window.currentWatchingAnime.season,
                episode: window.currentWatchingAnime.episode,
                progress: progress,
                currentTime: player.currentTime,
                timestamp: Date.now()
              });
            }
          }
        }, 5000); // Update every 5 seconds
      }
    });
    
    player.addEventListener('pause', () => {
      if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = null;
      }
      // Save progress on pause
      if (window.currentWatchingAnime && window.profileManager && player.duration > 0) {
        const activeProfile = window.profileManager.getActiveProfile();
        if (activeProfile) {
          const progress = Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100));
          window.profileManager.updateContinueWatching(activeProfile.id, {
            animeId: window.currentWatchingAnime.id,
            title: window.currentWatchingAnime.title,
            thumbnail: window.currentWatchingAnime.thumbnail,
            season: window.currentWatchingAnime.season,
            episode: window.currentWatchingAnime.episode,
            progress: progress,
            currentTime: player.currentTime,
            timestamp: Date.now()
          });
        }
      }
    });
    
    player.addEventListener('ended', () => {
      if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = null;
      }
      // Mark as 100% complete
      if (window.currentWatchingAnime && window.profileManager) {
        const activeProfile = window.profileManager.getActiveProfile();
        if (activeProfile) {
          window.profileManager.updateContinueWatching(activeProfile.id, {
            animeId: window.currentWatchingAnime.id,
            title: window.currentWatchingAnime.title,
            thumbnail: window.currentWatchingAnime.thumbnail,
            season: window.currentWatchingAnime.season,
            episode: window.currentWatchingAnime.episode,
            progress: 100,
            currentTime: player.duration || 0,
            timestamp: Date.now()
          });
        }
      }
      
      // Auto-advance to next episode
      if (window.currentAnime && window.currentWatchingAnime) {
        const currentSeason = window.currentAnime.seasons?.find(s => s.number === window.currentWatchingAnime.season);
        if (currentSeason && currentSeason.episodes) {
          const nextEpisodeIndex = window.currentWatchingAnime.episode; // episode is 1-based, index is 0-based
          
          if (nextEpisodeIndex < currentSeason.episodes.length) {
            // Next episode exists in current season
            console.log(`⏭️ Auto-advancing to next episode: S${window.currentWatchingAnime.season}E${nextEpisodeIndex + 1}`);
            setTimeout(() => {
              window.openEpisode(window.currentAnime, window.currentWatchingAnime.season, nextEpisodeIndex);
            }, 1000); // Wait 1 second before auto-advance
          } else {
            // Check if there's a next season
            const nextSeason = window.currentAnime.seasons?.find(s => s.number === window.currentWatchingAnime.season + 1);
            if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
              console.log(`⏭️ Auto-advancing to next season: S${nextSeason.number}E1`);
              setTimeout(() => {
                window.openEpisode(window.currentAnime, nextSeason.number, 0);
              }, 1000);
            } else {
              console.log('✅ Finished watching all episodes!');
            }
          }
        }
      }
    });
  }
});

window.addEventListener('animeDataLoaded', () => {
  try { if (typeof loadAnimeSection === 'function') loadAnimeSection('anime'); } catch(e){}
  try { if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(),'continue-watching-grid'); } catch(e){}
  try { if (typeof bindProfileModalControls === 'function') bindProfileModalControls(); } catch(e){}
  try { if (typeof renderMusicLibrary === 'function' && window.animeDB) renderMusicLibrary(window.animeDB.musicLibrary); } catch(e){}
});
