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
      if (!confirm('Apagar histórico de continuar assistindo?')) return;
      try { localStorage.removeItem('continueWatching'); localStorage.removeItem('watchedEpisodes'); } catch(e){}
      if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(), 'continue-watching-grid');
      alert('Histórico apagado.');
    });
  }
  
  // Clear history button 2 (in continue section)
  const clearBtn2 = document.getElementById('clear-history-btn-2');
  if (clearBtn2) {
    clearBtn2.addEventListener('click', () => {
      if (!confirm('Apagar histórico de continuar assistindo?')) return;
      try { localStorage.removeItem('continueWatching'); localStorage.removeItem('watchedEpisodes'); } catch(e){}
      if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(), 'continue-grid');
      alert('Histórico apagado.');
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
        card.innerHTML = `
          <h4>${item.title}</h4>
          <time datetime="${item.createdAt}">${createdAt.toLocaleDateString('pt-BR')}</time>
          <p>${item.message}</p>
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="news-card-image">` : ''}
        `;

        if (isAdmin()) {
          const actions = document.createElement('div');
          actions.className = 'news-card-actions';
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-secondary';
          deleteBtn.textContent = 'Apagar';
          deleteBtn.addEventListener('click', () => {
            if (!confirm('Deseja apagar esta notícia?')) return;
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
        alert('Acesso admin necessário.');
        return;
      }
      downloadNewsJsonFile(newsItems);
    });
  }

  if (newsForm) {
    newsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!isAdmin()) {
        alert('Acesso admin necessário.');
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

function onVideoSetSource(player){
  if (!player) return;
  if (videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout = null; }
  clearVideoError();
  videoLoadTimeout = setTimeout(() => {
    if (player && player.readyState < 3 && !player.paused) showVideoError('Tempo de carregamento excedido. Clique no play para tentar novamente.');
    videoLoadTimeout = null;
  }, 15000);

  const onPlaying = function(){
    if (videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout = null; }
    clearVideoError();
    player.removeEventListener('playing', onPlaying);
  };
  player.addEventListener('playing', onPlaying);

  const onError = function(){
    showVideoError('Erro ao reproduzir. Clique no play para tentar novamente.');
    if (videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout = null; }
    player.removeEventListener('error', onError);
  };
  player.addEventListener('error', onError);
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
    }
    
    const season = (anime.seasons || []).find(s => s.number === seasonNumber);
    const episode = season && Array.isArray(season.episodes) ? season.episodes[episodeIndex] : null;
    const player = document.getElementById('anime-player'); if (!player) return;
    if (episode && episode.videoUrl){ player.src = episode.videoUrl; onVideoSetSource(player); }
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

// Update progress periodically while video is playing
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('anime-player');
  if (player) {
    let progressUpdateInterval = null;
    
    player.addEventListener('timeupdate', () => {
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
