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

  // Create an anime card element
  function createAnimeCard(anime) {
    if (!anime) return null;
    
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.animeId = anime.id;
    
    const thumbnail = anime.thumbnail || anime.cover || 'images/bg-default.jpg';
    const title = escapeHtml(anime.title || anime.name || 'Sem título');
    const type = escapeHtml(anime.type || 'anime');
    
    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}">
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">${type.toUpperCase()}</p>
      </div>
      <div class="trailer-overlay">
        <i class="fas fa-play"></i>
        <p>Assistir</p>
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
    
    card.innerHTML = `
      <div class="anime-thumbnail">
        <img src="${escapeHtml(thumbnail)}" alt="${title}">
        <div class="progress-bar" style="width: ${Math.min(100, Math.max(0, progress))}%;"></div>
      </div>
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <p class="anime-meta">T${season} • EP${episode} • ${Math.round(progress)}%</p>
      </div>
      <div class="trailer-overlay">
        <i class="fas fa-play"></i>
        <p>Continuar</p>
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
    
    // Update video title and description
    const titleEl = document.getElementById('video-title');
    const descEl = document.getElementById('video-description');
    if (titleEl) titleEl.textContent = anime.title || 'Sem título';
    if (descEl) descEl.textContent = anime.description || 'Sem descrição disponível';
    
    // Populate season select
    const seasonSelect = document.getElementById('season-select');
    if (seasonSelect && anime.seasons) {
      seasonSelect.innerHTML = '';
      anime.seasons.forEach((s, idx) => {
        const option = document.createElement('option');
        option.value = s.number;
        option.textContent = `Temporada ${s.number}`;
        if (s.number === season) option.selected = true;
        seasonSelect.appendChild(option);
      });
      
      // Add change handler
      seasonSelect.onchange = () => {
        const newSeason = parseInt(seasonSelect.value);
        populateEpisodes(anime, newSeason);
        if (anime.seasons.find(s => s.number === newSeason)?.episodes?.length > 0) {
          openEpisode(anime, newSeason, 0);
        }
      };
    }
    
    // Populate episodes for selected season
    populateEpisodes(anime, season);
    
    // Open the episode
    if (window.openEpisode && typeof window.openEpisode === 'function') {
      window.openEpisode(anime, season, episode);
    }
    
    // Show modal - use flex for proper keyboard detection
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function populateEpisodes(anime, seasonNumber) {
    const episodeSelect = document.getElementById('episode-select');
    if (!episodeSelect || !anime.seasons) return;
    
    const season = anime.seasons.find(s => s.number === seasonNumber);
    if (!season || !season.episodes) return;
    
    episodeSelect.innerHTML = '';
    season.episodes.forEach((ep, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `Episódio ${idx + 1}${ep.title ? ' - ' + ep.title : ''}`;
      episodeSelect.appendChild(option);
    });
    
    // Add change handler
    episodeSelect.onchange = () => {
      const episodeIdx = parseInt(episodeSelect.value);
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

  console.log('✅ Anime renderer loaded');
})();
