// Music Player - Fixed with singleton audio element and proper error handling
(function() {
    'use strict';
    
    // Singleton audio element
    let musicAudio = null;
    let currentTrackIndex = 0;
    let currentPlaylist = [];
    let isPlaying = false;
    let isShuffled = false;
    let isRepeated = false;
    let loadTimeout = null;
    
    function getMusicAudio() {
        if (!musicAudio) {
            musicAudio = document.getElementById('music-playing-audio');
            if (!musicAudio) {
                musicAudio = document.createElement('audio');
                musicAudio.id = 'music-playing-audio';
                musicAudio.preload = 'metadata';
                document.body.appendChild(musicAudio);
            }
        }
        return musicAudio;
    }
    
    function playMusicUrl(url) {
        const audio = getMusicAudio();
        
        // Clear any existing timeout
        if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
        }
        
        // Clear any previous error
        clearMusicError();
        
        audio.src = url;
        
        // Set 15s timeout
        loadTimeout = setTimeout(() => {
            if (audio.readyState < 2) { // HAVE_CURRENT_DATA
                showMusicError('Tempo limite excedido ao carregar a música');
                audio.pause();
            }
        }, 15000);
        
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Success
                if (loadTimeout) {
                    clearTimeout(loadTimeout);
                    loadTimeout = null;
                }
                isPlaying = true;
                updatePlayButtons();
            }).catch((error) => {
                console.error('Error playing music:', error);
                showMusicError('Erro ao reproduzir música');
            });
        }
    }
    
    function showMusicError(message) {
        const container = document.getElementById('music-grid');
        if (!container) return;
        
        let errorEl = document.getElementById('music-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'music-error';
            errorEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 71, 87, 0.9);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            if (errorEl && errorEl.parentNode) {
                errorEl.style.display = 'none';
            }
        }, 5000);
    }
    
    function clearMusicError() {
        const errorEl = document.getElementById('music-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }
    
    function updatePlayButtons() {
        const playBtn = document.getElementById('music-play');
        const miniPlayBtn = document.getElementById('mini-play');
        
        const icon = isPlaying ? 'pause' : 'play';
        if (playBtn) playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        if (miniPlayBtn) miniPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }
    
    function renderMusicLibrary(musicLibrary) {
        if (!musicLibrary || !musicLibrary.themes) {
            console.warn('Music library not available');
            return;
        }
        
        let musicGrid = document.getElementById('music-grid');
        if (!musicGrid) {
            // Create music grid if it doesn't exist
            const container = document.getElementById('music-player-container');
            if (container) {
                musicGrid = document.createElement('div');
                musicGrid.id = 'music-grid';
                musicGrid.className = 'music-grid';
                container.appendChild(musicGrid);
            } else {
                console.warn('Music player container not found');
                return;
            }
        }
        
        musicGrid.innerHTML = '';
        currentPlaylist = musicLibrary.themes;
        
        // Group by anime
        const animeGroups = {};
        musicLibrary.themes.forEach((track, index) => {
            if (!animeGroups[track.anime]) {
                animeGroups[track.anime] = [];
            }
            animeGroups[track.anime].push({...track, originalIndex: index});
        });
        
        // Render groups
        for (const [anime, tracks] of Object.entries(animeGroups)) {
            const section = document.createElement('div');
            section.className = 'anime-music-section';
            section.innerHTML = `
                <div class="anime-header">
                    <h2>${anime}</h2>
                </div>
                <div class="anime-music-grid">
                    ${tracks.map(track => `
                        <div class="music-card play-music" data-index="${track.originalIndex}" data-url="${track.audio}">
                            <div class="music-cover">
                                <img src="${track.cover || 'images/bg-default.jpg'}" loading="lazy" alt="${track.title}">
                                <div class="play-overlay">
                                    <i class="fas fa-play"></i>
                                </div>
                                <span class="music-type ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                            </div>
                            <div class="music-info">
                                <h3 class="music-title">${track.title}</h3>
                                <p class="music-artist">${track.artist}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            musicGrid.appendChild(section);
        }
        
        // Bind play buttons
        document.querySelectorAll('.play-music').forEach(card => {
            card.addEventListener('click', function() {
                const url = this.dataset.url;
                const index = parseInt(this.dataset.index);
                currentTrackIndex = index;
                playMusicUrl(url);
            });
        });
    }
    
    // Listen for animeDataLoaded event
    window.addEventListener('animeDataLoaded', () => {
        try {
            if (window.animeDB && window.animeDB.getMusicLibrary) {
                const musicLibrary = window.animeDB.getMusicLibrary();
                renderMusicLibrary(musicLibrary);
                console.log('Music library rendered successfully');
            }
        } catch (error) {
            console.error('Error rendering music library:', error);
        }
    });
    
    /**
     * Load and render music library
     * @param {string} type - Music type to load. Currently only 'themes' is supported.
     * @returns {void}
     * @note Only 'themes' type is currently implemented. Other types will log a warning.
     */
    function loadMusic(type) {
        try {
            if (type !== 'themes') {
                console.warn(`loadMusic: Type "${type}" not supported, only "themes" is available`);
                return;
            }
            
            if (window.animeDB && window.animeDB.getMusicLibrary) {
                const musicLibrary = window.animeDB.getMusicLibrary();
                if (musicLibrary && musicLibrary.themes) {
                    renderMusicLibrary(musicLibrary);
                }
            }
        } catch (error) {
            console.error('Error loading music:', error);
        }
    }
    
    // Expose functions globally
    window.renderMusicLibrary = renderMusicLibrary;
    window.playMusicUrl = playMusicUrl;
    window.loadMusic = loadMusic;
    
})();
