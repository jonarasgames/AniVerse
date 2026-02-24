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
    'L': 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Classifica%C3%A7%C3%A3o_Indicativa_Livre.svg',
    '10': 'https://upload.wikimedia.org/wikipedia/commons/9/92/Classifica%C3%A7%C3%A3o_Indicativa_10_anos.svg',
    '12': 'https://upload.wikimedia.org/wikipedia/commons/6/60/Classifica%C3%A7%C3%A3o_Indicativa_12_anos.svg',
    '14': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Classifica%C3%A7%C3%A3o_Indicativa_14_anos.svg',
    '16': 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Classifica%C3%A7%C3%A3o_Indicativa_16_anos.svg',
    '18': 'https://files.catbox.moe/anym1r.png'
  };

  // Helper function to get age rating badge HTML
  function getAgeRatingBadge(ratingAge) {
    if (!ratingAge || !AGE_RATING_IMAGES[ratingAge]) return '';
    return `<img src="${AGE_RATING_IMAGES[ratingAge]}" alt="Classificação ${ratingAge === 'L' ? 'Livre' : ratingAge + ' anos'}" class="age-rating-badge">`;
  }

  // Export for use in other files
  window.AGE_RATING_IMAGES = AGE_RATING_IMAGES;

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
    
    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}">
        <div class="trailer-overlay">
          <i class="fas fa-play"></i>
          <p>Assistir</p>
          ${ageRatingBadge}
        </div>
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">${type.toUpperCase()}</p>
      </div>
    `;
    
    // Add click handler to open video modal
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openAnimeModal(anime));
    
    return card;
  }

  // Create a continue watching card with progress
  function createContinueWatchingCard(anime) {
    if (!anime) return null;
    
    const card = document.createElement('div');
    card.className = 'anime-card continue-card';
    card.dataset.animeId = anime.id;
    
    const thumbnail = anime.thumbnail || anime.cover || 'images/bg-default.jpg';
    const title = escapeHtml(anime.title || anime.name || 'Sem título');
    const progress = anime.progress || 0;
    const season = anime.season || 1;
    const episode = anime.episode || 1;
    const ageRatingBadge = getAgeRatingBadge(anime.rating_age);
    
    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}">
        <div class="progress-bar" style="width: ${Math.min(100, Math.max(0, progress))}%;"></div>
        <div class="trailer-overlay">
          <i class="fas fa-play"></i>
          <p>Continuar</p>
          ${ageRatingBadge}
        </div>
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">T${season} • EP${episode} • ${Math.round(progress)}%</p>
      </div>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      openAnimeModal(anime, season, episode - 1);
    });
    
    return card;
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
    
    continueWatching.forEach(anime => {
      const card = createContinueWatchingCard(anime);
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
    const animes = window.animeDB.animes.slice(0, 24);
    
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
          openAnimeModal(anime);
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
        
        // Pause video
        const player = document.getElementById('anime-player');
        if (player) {
          try {
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
          } catch (e) {
            console.warn('Error saving progress:', e);
          }
        }
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

  console.log('✅ Anime renderer loaded');
})();
