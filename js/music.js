/* js/music.js - Music rendering grouped by anime with mini-player */
(function() {
    'use strict';
    
    let musicPlayerInstance = null;
    let currentPlayingCard = null;
    
    // Get or create singleton audio element
    function getMusicAudio() {
        if (musicPlayerInstance) return musicPlayerInstance;
        
        // Remove any existing audio elements except ours
        document.querySelectorAll('audio').forEach(el => {
            if (el.id !== 'music-playing-audio') {
                try {
                    el.pause();
                    el.remove();
                } catch(e) {}
            }
        });
        
        let audio = document.getElementById('music-playing-audio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'music-playing-audio';
            audio.preload = 'metadata';
            audio.style.display = 'none';
            document.body.appendChild(audio);
        }
        
        musicPlayerInstance = audio;
        return audio;
    }
    
    // Create mini-player UI
    function createMiniPlayer() {
        if (document.getElementById('mini-player')) return;
        
        const miniPlayer = document.createElement('div');
        miniPlayer.id = 'mini-player';
        miniPlayer.className = 'mini-player hidden';
        miniPlayer.innerHTML = `
            <img id="mini-player-thumb" src="" alt="Album art" class="mini-player-thumb">
            <div class="mini-player-info">
                <div id="mini-player-title" class="mini-player-title">Track Title</div>
                <div id="mini-player-artist" class="mini-player-artist">Artist</div>
            </div>
            <div class="mini-player-controls">
                <button id="mini-play-pause" class="mini-control-btn" aria-label="Play/Pause">
                    <i class="fas fa-pause"></i>
                </button>
                <button id="mini-close" class="mini-control-btn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(miniPlayer);
        
        const audio = getMusicAudio();
        
        // Event listeners
        document.getElementById('mini-play-pause').addEventListener('click', togglePlayPause);
        document.getElementById('mini-close').addEventListener('click', closeMiniPlayer);
        
        // Update play/pause icon based on audio state
        audio.addEventListener('play', updatePlayPauseIcon);
        audio.addEventListener('pause', updatePlayPauseIcon);
        audio.addEventListener('ended', () => {
            closeMiniPlayer();
            if (currentPlayingCard) {
                currentPlayingCard.classList.remove('playing');
                currentPlayingCard = null;
            }
        });
    }
    
    function updatePlayPauseIcon() {
        const audio = getMusicAudio();
        const icon = document.querySelector('#mini-play-pause i');
        if (icon) {
            icon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
        }
    }
    
    function togglePlayPause() {
        const audio = getMusicAudio();
        if (audio.paused) {
            audio.play().catch(err => {
                console.error('Play failed:', err);
                showMusicError('Erro ao reproduzir.');
            });
        } else {
            audio.pause();
        }
    }
    
    function closeMiniPlayer() {
        const audio = getMusicAudio();
        audio.pause();
        audio.src = '';
        
        const miniPlayer = document.getElementById('mini-player');
        if (miniPlayer) {
            miniPlayer.classList.add('hidden');
        }
        
        if (currentPlayingCard) {
            currentPlayingCard.classList.remove('playing');
            currentPlayingCard = null;
        }
    }
    
    function playMusic(src, title, artist, thumb, card) {
        createMiniPlayer();
        
        const miniPlayer = document.getElementById('mini-player');
        const audio = getMusicAudio();
        
        // Stop if clicking same track
        if (currentPlayingCard === card && !audio.paused) {
            closeMiniPlayer();
            return;
        }
        
        // Update previous card
        if (currentPlayingCard && currentPlayingCard !== card) {
            currentPlayingCard.classList.remove('playing');
        }
        
        // Set new track
        audio.src = src;
        audio.load();
        
        // Timeout for loading
        const loadTimeout = setTimeout(() => {
            if (audio.readyState < 2) {
                showMusicError('Tempo de carregamento excedido. Tente novamente.');
            }
        }, 15000);
        
        audio.addEventListener('loadeddata', () => {
            clearTimeout(loadTimeout);
        }, { once: true });
        
        audio.play().catch(err => {
            console.error('Play failed:', err);
            showMusicError('Erro ao reproduzir. Clique para tentar novamente.');
        });
        
        // Update mini-player UI
        document.getElementById('mini-player-thumb').src = thumb || 'images/bg-default.jpg';
        document.getElementById('mini-player-title').textContent = title;
        document.getElementById('mini-player-artist').textContent = artist;
        
        miniPlayer.classList.remove('hidden');
        
        // Update current playing card
        currentPlayingCard = card;
        if (card) {
            card.classList.add('playing');
        }
    }
    
    function showMusicError(msg) {
        let el = document.getElementById('music-error-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'music-error-container';
            Object.assign(el.style, {
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                zIndex: '100000',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                textAlign: 'center',
                maxWidth: '80%'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        setTimeout(() => {
            if (el) el.remove();
        }, 5000);
    }
    
    // Render music grid grouped by anime
    function renderMusicGrid() {
        const musicGrid = document.getElementById('music-grid');
        if (!musicGrid) {
            console.warn('music.js: #music-grid not found');
            return;
        }
        
        if (!window.animeDB || !window.animeDB.musicLibrary) {
            console.warn('music.js: animeDB.musicLibrary not available');
            ensureFallbackMessage(musicGrid, 'música');
            return;
        }
        
        const musicLibrary = window.animeDB.musicLibrary;
        musicGrid.innerHTML = '';
        
        // Group themes by anime
        const grouped = {};
        (musicLibrary.themes || []).forEach(theme => {
            const animeName = theme.anime || 'Outros';
            if (!grouped[animeName]) {
                grouped[animeName] = [];
            }
            grouped[animeName].push(theme);
        });
        
        // Render each anime section
        Object.entries(grouped).forEach(([animeTitle, tracks]) => {
            const section = document.createElement('div');
            section.className = 'music-section';
            
            const header = document.createElement('h2');
            header.className = 'music-anime-title';
            header.textContent = `${animeTitle} (${tracks.length} ${tracks.length === 1 ? 'música' : 'músicas'})`;
            section.appendChild(header);
            
            const tracksContainer = document.createElement('div');
            tracksContainer.className = 'music-tracks';
            
            tracks.forEach(track => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.src = track.audio;
                card.dataset.title = track.title;
                card.dataset.artist = track.artist || animeTitle;
                card.dataset.thumb = track.cover || 'images/bg-default.jpg';
                
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${track.cover || 'images/bg-default.jpg'}" alt="${track.title}">
                        <div class="music-play-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="music-info">
                        <div class="music-title">${track.title}</div>
                        <div class="music-artist">${track.artist || animeTitle}</div>
                        <div class="music-type">${track.type === 'opening' ? 'Opening' : 'Ending'}</div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    playMusic(
                        card.dataset.src,
                        card.dataset.title,
                        card.dataset.artist,
                        card.dataset.thumb,
                        card
                    );
                });
                
                tracksContainer.appendChild(card);
            });
            
            section.appendChild(tracksContainer);
            musicGrid.appendChild(section);
        });
        
        // Add fallback if no music
        if (Object.keys(grouped).length === 0) {
            ensureFallbackMessage(musicGrid, 'música');
        }
        
        console.log('Music grid rendered with', Object.keys(grouped).length, 'anime sections');
    }
    
    function ensureFallbackMessage(container, type) {
        if (!container) return;
        
        const existingCards = container.querySelectorAll('.music-card, .music-section');
        if (existingCards.length === 0) {
            const fallback = document.createElement('div');
            fallback.className = 'fallback-card';
            fallback.style.cssText = `
                text-align: center;
                padding: 60px 20px;
                color: var(--text-color);
                font-size: 1.2rem;
            `;
            fallback.innerHTML = `
                <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>Nenhuma ${type} disponível no momento.</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Tente recarregar a página ou adicionar conteúdo.</p>
            `;
            container.appendChild(fallback);
        }
    }
    
    // Initialize when anime data is loaded
    function init() {
        if (window.animeDB && window.animeDB.musicLibrary) {
            renderMusicGrid();
        } else {
            window.addEventListener('animeDataLoaded', renderMusicGrid);
        }
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export functions
    window.renderMusicGrid = renderMusicGrid;
    window.playMusic = playMusic;
})();
