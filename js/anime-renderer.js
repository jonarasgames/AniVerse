/* js/anime-renderer.js - Core rendering functions for anime grids */
(function(){
  'use strict';

  // Helper function to escape HTML and prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Age rating image URLs mapping
  const AGE_RATING_IMAGES = {
    'L': 'https://media.discordapp.net/attachments/1414839380685885510/1531666654331670625/xb49hz2.png?ex=6a6a0b3b&is=6a68b9bb&hm=b8ae2734c9e73e65382d74977fff0b8ce5eb3fe8b71ec8b1d27865c8f20befdf&=&format=webp&quality=lossless&width=384&height=384',
    '6': 'https://media.discordapp.net/attachments/1414839380685885510/1531666651928592585/x2n67kn.png?ex=6a6a0b3a&is=6a68b9ba&hm=05e60f082b0284d136492d765543e79839db1305ca87b834f90a0f518df8e280&=&format=webp&quality=lossless&width=384&height=384'
    '10': 'https://media.discordapp.net/attachments/1414839380685885510/1531666652301889577/srbz961.png?ex=6a6a0b3a&is=6a68b9ba&hm=003e674894a5749d401045e4e57f1dcd31e2771a0bb285bdc4475a8b45af34fa&=&format=webp&quality=lossless&width=384&height=384',
    '12': 'https://media.discordapp.net/attachments/1414839380685885510/1531666652666663064/bshf143.png?ex=6a6a0b3a&is=6a68b9ba&hm=ce0144414e9a114bc3dc506c9458b061ea61b468701ad36c2f334abe7b281daf&=&format=webp&quality=lossless&width=384&height=384',
    '14': 'https://media.discordapp.net/attachments/1414839380685885510/1531666653077835816/x9b0j2m.png?ex=6a6a0b3b&is=6a68b9bb&hm=60aaf19fb0996d3e809310369997db9053a60e1e0a19603d6f0f86b8a8072357&=&format=webp&quality=lossless&width=384&height=384',
    '16': 'https://media.discordapp.net/attachments/1414839380685885510/1531666653404987574/w7zxxrq.png?ex=6a6a0b3b&is=6a68b9bb&hm=f653939933eda4d7ec50c7891cff7c7c07479d4d62a4ab6cd2451eda6eb3bea1&=&format=webp&quality=lossless&width=384&height=384',
    '18': 'https://media.discordapp.net/attachments/1414839380685885510/1531666653899788480/km5dd0w.png?ex=6a6a0b3b&is=6a68b9bb&hm=5a0877c17c8e275c226dbc736a62f4e03d905bf1ba0525f6d2c2fda224a28c06&=&format=webp&quality=lossless&width=384&height=384'
  };

  // Helper function to get age rating badge HTML
  function getAgeRatingBadge(ratingAge) {
    if (!ratingAge || !AGE_RATING_IMAGES[ratingAge]) return '';
    return `<img src="${AGE_RATING_IMAGES[ratingAge]}" alt="Classificação ${ratingAge === 'L' ? 'Livre' : ratingAge + ' anos'}" class="age-rating-badge">`;
  }

  // Export for use in other files
  window.AGE_RATING_IMAGES = AGE_RATING_IMAGES;


  function getAnimeYear(anime) {
    return anime?.year || anime?.releaseYear || anime?.ano || anime?.launchYear || anime?.release_date?.slice?.(0,4) || null;
  }

  function getAnimeScore(anime) {
    const value = anime?.rating ?? anime?.score ?? anime?.nota;
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  }

  function buildAnimeMeta(anime) {
    const parts = [String(anime?.type || 'anime').toUpperCase()];
    const year = getAnimeYear(anime);
    const score = getAnimeScore(anime);
    if (year) parts.push(String(year));
    if (score) parts.push(`⭐ ${score}`);
    return parts.join(' • ');
  }

  // Create an anime card element
  function createAnimeCard(anime) {
    if (!anime) return null;
    
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.animeId = anime.id;
    
    const thumbnail = anime.thumbnail || anime.cover || 'images/bg-default.jpg';
    const title = escapeHtml(anime.title || anime.name || 'Sem título');
    const type = escapeHtml(anime.type || 'anime');
    const ageRatingBadge = getAgeRatingBadge(anime.rating_age);
    
    const trailer = anime.trailer || '';
    const performanceMode = localStorage.getItem('aniversePerformanceMode') === '1';

    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}" loading="lazy" decoding="async">
        <video class="card-hover-trailer" muted playsinline preload="none" loop style="display:none"></video>
        <div class="trailer-overlay">
          <i class="fas fa-play"></i>
          <p>Assistir</p>
          ${ageRatingBadge}
        </div>
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">${buildAnimeMeta(anime)}</p>
      </div>
    `;

    const trailerVideo = card.querySelector('.card-hover-trailer');
    let hoverTimer = null;

    card.addEventListener('mouseenter', () => {
      if (performanceMode || !trailer || !trailerVideo) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        trailerVideo.src = trailer;
        trailerVideo.style.display = 'block';
        trailerVideo.play().catch(() => {});
        card.classList.add('playing-hover-trailer');
      }, 5000);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      if (!trailerVideo) return;
      trailerVideo.pause();
      trailerVideo.removeAttribute('src');
      trailerVideo.load();
      trailerVideo.style.display = 'none';
      card.classList.remove('playing-hover-trailer');
    });

    // Add click handler to open video modal
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      if (document.body.classList.contains('admin-inline-mode')) return;
      if (typeof window.openAnimeModal === 'function') {
        window.openAnimeModal(anime);
      } else {
        openAnimeModal(anime);
      }
    });

    return card;
  }

  function formatRemainingTime(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}min restantes`;
    return `${Math.max(1, minutes)}min restantes`;
  }

  function resumeAnime(anime, season, episode) {
    if (typeof window.openAnimeModal === 'function') {
      window.openAnimeModal(anime, season, episode - 1);
    } else {
      openAnimeModal(anime, season, episode - 1);
    }
  }

  // Create a continue watching card with progress
  function createContinueWatchingCard(anime, options = {}) {
    if (!anime) return null;
    
    const card = document.createElement('div');
    card.className = 'anime-card continue-card';
    card.dataset.animeId = anime.id;
    
    const thumbnail = anime.thumbnail || anime.cover || 'images/bg-default.jpg';
    const title = escapeHtml(anime.title || anime.name || 'Sem título');
    const progress = anime.progress || 0;
    const season = anime.season || 1;
    const episode = anime.episode || 1;
    const remainingLabel = formatRemainingTime(anime.remainingTotalSeconds);
    const showResumeButton = options.showResumeButton !== false;
    const ageRatingBadge = getAgeRatingBadge(anime.rating_age);
    
    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}">
        <div class="continue-progress-track">
          <div class="continue-progress-bar" style="width: ${Math.min(100, Math.max(0, progress))}%;"></div>
        </div>
        <div class="trailer-overlay">
          <i class="fas fa-play"></i>
          <p>Continuar</p>
          ${ageRatingBadge}
        </div>
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">Atual: T${season} • EP${episode}</p>
        <p class="anime-meta">${Math.round(progress)}% • ${remainingLabel}</p>
        ${showResumeButton ? '<button type="button" class="continue-resume-btn">Retomar</button>' : ''}
      </div>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', async () => {
      if (!navigator.onLine && typeof window.playDownloadedEpisodeFromContinue === 'function') {
        const playedOffline = await window.playDownloadedEpisodeFromContinue(anime);
        if (playedOffline) return;
      }
      resumeAnime(anime, season, episode);
    });

    if (showResumeButton) {
      const resumeBtn = card.querySelector('.continue-resume-btn');
      if (resumeBtn) {
        resumeBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          resumeAnime(anime, season, episode);
        });
      }
    }
    
    return card;
  }


  function getCanonicalAnimeParam(anime) {
    const slug = String(anime?.slug || '').trim().toLowerCase();
    if (slug) return slug;
    const id = String(anime?.id || '').trim().toLowerCase();
    return id;
  }

  
  // Open anime modal (video player)
  function openAnimeModal(anime, seasonNumber, episodeIndex) {
    const modal = document.getElementById('video-modal');
    if (!modal) {
      console.warn('Video modal not found');
      return;
    }
    
    // Set up anime data
    const season = seasonNumber || 1;
    const episode = episodeIndex !== undefined ? episodeIndex : 0;
    
    // Store current anime globally so selectors know which anime they're for
    window.currentAnime = anime;
    const canonicalAnimeParam = getCanonicalAnimeParam(anime);
    if (canonicalAnimeParam) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('anime', canonicalAnimeParam);
      nextUrl.searchParams.set('season', String(season || 1));
      nextUrl.searchParams.set('ep', String((episode || 0) + 1));
      window.history.replaceState({}, '', nextUrl.toString());
      localStorage.setItem('aniverseLastAnimeLink', JSON.stringify({
        anime: canonicalAnimeParam,
        season: Number(season || 1),
        ep: Number((episode || 0) + 1)
      }));
    }
    
    // Update video title and description
    const titleEl = document.getElementById('video-title');
    const descEl = document.getElementById('video-description');
    if (titleEl) titleEl.textContent = anime.title || 'Sem título';
    if (descEl) descEl.textContent = anime.description || 'Sem descrição disponível';
    
    // Populate season select
    const seasonSelect = document.getElementById('season-select');
    if (seasonSelect && anime.seasons) {
      // Remove old event listeners by cloning
      const newSeasonSelect = seasonSelect.cloneNode(false);
      seasonSelect.parentNode.replaceChild(newSeasonSelect, seasonSelect);
      
      newSeasonSelect.innerHTML = '';
      anime.seasons.forEach((s, idx) => {
        const option = document.createElement('option');
        option.value = s.number;
        option.textContent = s.name || `Temporada ${s.number}`;
        if (s.number === season) option.selected = true;
        newSeasonSelect.appendChild(option);
      });
      
      // Add change handler with closure to current anime
      newSeasonSelect.onchange = () => {
        const newSeason = parseInt(newSeasonSelect.value);
        populateEpisodes(anime, newSeason, 0); // Reset to first episode
        if (anime.seasons.find(s => s.number === newSeason)?.episodes?.length > 0) {
          openEpisode(anime, newSeason, 0);
        }
      };
    }
    
    // Populate episodes for selected season AND select the current episode
    populateEpisodes(anime, season, episode);
    
    // Open the episode
    if (window.openEpisode && typeof window.openEpisode === 'function') {
      window.openEpisode(anime, season, episode);
    }
    
    // Show modal - use flex for proper keyboard detection
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }


  window.syncEpisodeSelectors = function(anime, seasonNumber, episodeIndex) {
    if (!anime || !anime.seasons) return;

    const seasonSelect = document.getElementById('season-select');
    if (seasonSelect) {
      const targetSeason = String(seasonNumber);
      if (seasonSelect.value !== targetSeason) {
        seasonSelect.value = targetSeason;
      }
    }

    populateEpisodes(anime, seasonNumber, episodeIndex);

    const refreshedEpisodeSelect = document.getElementById('episode-select');
    if (refreshedEpisodeSelect) {
      refreshedEpisodeSelect.value = String(episodeIndex);
    }
  };

  function populateEpisodes(anime, seasonNumber, selectedEpisodeIndex) {
    const episodeSelect = document.getElementById('episode-select');
    if (!episodeSelect || !anime.seasons) return;
    
    const season = anime.seasons.find(s => s.number === seasonNumber);
    if (!season || !season.episodes) return;
    
    // Remove old event listeners by cloning
    const newEpisodeSelect = episodeSelect.cloneNode(false);
    episodeSelect.parentNode.replaceChild(newEpisodeSelect, episodeSelect);
    
    newEpisodeSelect.innerHTML = '';
    season.episodes.forEach((ep, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `Episódio ${idx + 1}${ep.title ? ' - ' + ep.title : ''}`;
      // Select the correct episode
      if (selectedEpisodeIndex !== undefined && idx === selectedEpisodeIndex) {
        option.selected = true;
      }
      newEpisodeSelect.appendChild(option);
    });
    
    // Add change handler with closure to current anime
    newEpisodeSelect.onchange = () => {
      const episodeIdx = parseInt(newEpisodeSelect.value);
      if (window.openEpisode && typeof window.openEpisode === 'function') {
        window.openEpisode(anime, seasonNumber, episodeIdx);
      }
    };
  }

  // Render anime section by type
  window.loadAnimeSection = function(type) {
    if (!window.animeDB || !window.animeDB.animes) {
      console.warn('AnimeDB not ready');
      return;
    }
    
    const animes = window.animeDB.getAnimesByType(type);
    const gridId = type + 's-grid';
    const grid = document.getElementById(gridId);
    
    if (!grid) {
      console.warn(`Grid not found: ${gridId}`);
      return;
    }
    
    grid.innerHTML = '';
    
    if (animes.length === 0) {
      grid.innerHTML = '<p style="padding: 20px; text-align: center; opacity: 0.7;">Nenhum anime encontrado nesta categoria.</p>';
      return;
    }
    
    animes.forEach(anime => {
      const card = createAnimeCard(anime);
      if (card) grid.appendChild(card);
    });
    
    console.log(`Loaded ${animes.length} animes for type: ${type}`);
  };

  // Render continue watching grid
  window.renderContinueWatchingGrid = function(continueWatching, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) {
      console.warn(`Continue watching grid not found: ${gridId}`);
      return;
    }
    
    grid.innerHTML = '';
    
    if (!continueWatching || continueWatching.length === 0) {
      grid.innerHTML = '<p style="padding: 20px; text-align: center; opacity: 0.7;">Nenhum anime em andamento. Comece a assistir algo!</p>';
      return;
    }
    
    const useDetailedCard = gridId === 'continue-watching-grid';
    continueWatching.forEach(anime => {
      const card = createContinueWatchingCard(anime, { showResumeButton: true });
      if (card) grid.appendChild(card);
    });
    
    console.log(`Rendered ${continueWatching.length} continue watching items`);
  };

  // Load new releases
  window.loadNewReleases = function() {
    if (!window.animeDB || !window.animeDB.animes) return;
    
    const grid = document.getElementById('new-releases-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const releases = window.animeDB.getNewReleases(12);
    
    releases.forEach(anime => {
      const card = createAnimeCard(anime);
      if (card) grid.appendChild(card);
    });
    
    console.log(`Loaded ${releases.length} new releases`);
  };

  // Load full catalog
  window.loadFullCatalog = function() {
    if (!window.animeDB || !window.animeDB.animes) return;
    
    const grid = document.getElementById('full-catalog-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const animes = Array.isArray(window.animeDB.animes) ? window.animeDB.animes : [];
    
    animes.forEach(anime => {
      const card = createAnimeCard(anime);
      if (card) grid.appendChild(card);
    });
    
    console.log(`Loaded ${animes.length} catalog items`);
  };

  // Load continue watching (legacy support)
  window.loadContinueWatching = function() {
    if (!window.animeDB) return;
    const continueWatching = window.animeDB.getContinueWatching();
    renderContinueWatchingGrid(continueWatching, 'continue-watching-grid');
    renderContinueWatchingGrid(continueWatching, 'continue-grid');
  };

  // Create a collection card element
  function createCollectionCard(collection) {
    if (!collection) return null;
    
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.collectionId = collection.id;
    
    const thumbnail = collection.thumbnail || 'images/bg-default.jpg';
    const name = escapeHtml(collection.name || 'Coleção');
    const description = escapeHtml(collection.description || '');
    const count = collection.animeIds ? collection.animeIds.length : 0;
    
    card.innerHTML = `
      <div class="collection-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${name}">
        <div class="collection-count"><i class="fas fa-layer-group"></i> ${count}</div>
      </div>
      <div class="collection-info">
        <h3 class="collection-title">${name}</h3>
        <p class="collection-description">${description}</p>
      </div>
      <div class="trailer-overlay">
        <i class="fas fa-folder-open"></i>
        <p>Ver Coleção</p>
      </div>
    `;
    
    // Add click handler to expand collection
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => expandCollection(collection));
    
    return card;
  }

  // Expand a collection to show its contents
  function expandCollection(collection) {
    if (!collection || !collection.animeIds) return;
    
    const grid = document.getElementById('collections-grid');
    if (!grid) return;
    grid.classList.add('collections-expanded');
    
    // Get animes in this collection
    const animes = window.animeDB.getAnimesInCollection(collection.id);
    
    // Create expanded view
    grid.innerHTML = `
      <div class="collection-header">
        <button class="btn btn-secondary collection-back" onclick="window.loadCollections()">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>
        <div class="collection-header-info">
          <h2>${escapeHtml(collection.name)}</h2>
          <p>${escapeHtml(collection.description || '')}</p>
        </div>
      </div>
      <div class="collection-animes anime-grid"></div>
    `;
    
    const animesGrid = grid.querySelector('.collection-animes');
    if (animesGrid && animes.length > 0) {
      animes.forEach(anime => {
        const card = createAnimeCard(anime);
        if (card) animesGrid.appendChild(card);
      });
    } else if (animesGrid) {
      animesGrid.innerHTML = '<p style="padding: 20px; text-align: center; opacity: 0.7;">Nenhum anime encontrado nesta coleção.</p>';
    }
  }

  // Load collections section
  window.loadCollections = function() {
    if (!window.animeDB) {
      console.warn('AnimeDB not ready');
      return;
    }
    
    const collections = window.animeDB.getCollections();
    const grid = document.getElementById('collections-grid');
    
    if (!grid) {
      console.warn('Collections grid not found');
      return;
    }
    
    grid.classList.remove('collections-expanded');
    grid.innerHTML = '';
    
    if (!collections || collections.length === 0) {
      grid.innerHTML = '<p style="padding: 20px; text-align: center; opacity: 0.7;">Nenhuma coleção encontrada. Adicione coleções no arquivo anime-data.json.</p>';
      return;
    }
    
    collections.forEach(collection => {
      const card = createCollectionCard(collection);
      if (card) grid.appendChild(card);
    });
    
    console.log(`Loaded ${collections.length} collections`);
  };

  // Update collection indicator in video player
  window.updateCollectionIndicator = function(animeId) {
    const indicator = document.getElementById('collection-indicator');
    const nameEl = document.getElementById('collection-name');
    const itemsEl = document.getElementById('collection-items');
    
    if (!indicator || !nameEl || !itemsEl || !window.animeDB) {
      return;
    }
    
    const collection = window.animeDB.getCollectionForAnime(animeId);
    
    if (!collection) {
      indicator.style.display = 'none';
      return;
    }
    
    // Show collection indicator
    indicator.style.display = 'block';
    nameEl.textContent = collection.name;
    
    // Populate collection items
    const animes = window.animeDB.getAnimesInCollection(collection.id);
    itemsEl.innerHTML = '';
    
    animes.forEach(anime => {
      const item = document.createElement('div');
      item.className = 'collection-item' + (anime.id === Number(animeId) ? ' active' : '');
      item.innerHTML = `
        <img src="${escapeHtml(anime.thumbnail || 'images/bg-default.jpg')}" alt="${escapeHtml(anime.title)}">
        <span>${escapeHtml(anime.title)}</span>
      `;
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (anime.id !== Number(animeId)) {
          if (typeof window.openAnimeModal === 'function') {
            window.openAnimeModal(anime);
          } else {
            openAnimeModal(anime);
          }
        }
      });
      itemsEl.appendChild(item);
    });
  };

  // Close video modal handler
  const closeVideoBtn = document.getElementById('close-video');
  if (closeVideoBtn) {
    closeVideoBtn.addEventListener('click', () => {
      const modal = document.getElementById('video-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.remove('tv-video-open');
        const miniMusicPlayer = document.getElementById('music-mini-player');
        if (miniMusicPlayer) {
          miniMusicPlayer.classList.remove('hidden-during-video');
        }
        const videoContainer = document.getElementById('video-player-container');
        if (videoContainer) {
          videoContainer.classList.remove('is-fullscreen', 'controls-hidden', 'controls-visible');
        }
        
        // Pause video
        const player = document.getElementById('anime-player');
        if (player) {
          try {
            if (typeof player.__adaptiveCleanup === 'function') {
              player.__adaptiveCleanup();
            }
            player.pause();
            // Save progress if animeDB is available
            if (window.animeDB && window.currentAnimeData) {
              const currentTime = player.currentTime || 0;
              window.animeDB.saveContinueWatching(
                window.currentAnimeData.animeId,
                window.currentAnimeData.season,
                window.currentAnimeData.episode + 1,
                currentTime
              );
            }
            player.removeAttribute('src');
            while (player.firstChild) player.removeChild(player.firstChild);
            player.load();
          } catch (e) {
            console.warn('Error saving progress:', e);
          }
        }
        if (window.getNativeTvVideoControls) {
          try { window.getNativeTvVideoControls().stop(); } catch (_) {}
        }

        // Limpa os parâmetros da URL ao fechar o modal
        try {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.delete('anime');
          nextUrl.searchParams.delete('season');
          nextUrl.searchParams.delete('ep');
          window.history.replaceState({}, '', nextUrl.toString());
        } catch (_) {}
      }
    });
  }

  // Store current anime data globally for saving progress
  window.currentAnimeData = null;

  // Update openEpisode to track current anime
  const originalOpenEpisode = window.openEpisode;
  if (originalOpenEpisode) {
    window.openEpisode = function(anime, seasonNumber, episodeIndex) {
      window.currentAnimeData = {
        animeId: anime.id,
        season: seasonNumber,
        episode: episodeIndex
      };
      originalOpenEpisode(anime, seasonNumber, episodeIndex);
    };
  }

  // Export openAnimeModal to window for use by other modules (e.g., profile-multi.js)
  window.openAnimeModal = openAnimeModal;
  window.openAnimeFromUrlParams = function() {
    const params = new URLSearchParams(window.location.search || '');
    const animeParam = params.get('anime');
    const season = Number(params.get('season')) || 1;
    const episode = Math.max(0, (Number(params.get('ep')) || 1) - 1);
    if (!animeParam || !window.animeDB || !Array.isArray(window.animeDB.animes)) return;

    const normalizedAnimeParam = String(animeParam).trim().toLowerCase();
    const anime = window.animeDB.animes.find((item) => {
      const slug = String(item?.slug || '').trim().toLowerCase();
      const id = String(item?.id || '').trim().toLowerCase();
      return normalizedAnimeParam === slug || normalizedAnimeParam === id;
    });
    if (!anime) return;
    
    const canonicalAnimeParam = getCanonicalAnimeParam(anime);
    if (canonicalAnimeParam && normalizedAnimeParam !== canonicalAnimeParam) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('anime', canonicalAnimeParam);
      nextUrl.searchParams.set('season', String(season || 1));
      nextUrl.searchParams.set('ep', String((episode || 0) + 1));
      window.history.replaceState({}, '', nextUrl.toString());
    }

    openAnimeModal(anime, season, episode);
  };

  console.log('✅ Anime renderer loaded');
})();
