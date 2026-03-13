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
            
            // Restore saved volume
            try {
                const savedVolume = localStorage.getItem('musicVolume');
                const savedMuted = localStorage.getItem('musicMuted');
                if (savedVolume !== null) {
                    audio.volume = parseFloat(savedVolume);
                }
                if (savedMuted !== null) {
                    audio.muted = savedMuted === 'true';
                }
            } catch(e) {
                console.warn('Could not restore music volume:', e);
            }
        }
        
        // Restore saved volume preference
        const savedVolume = localStorage.getItem('musicVolume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            // Validate volume is within range [0, 1]
            if (!isNaN(volume) && volume >= 0 && volume <= 1) {
                audio.volume = volume;
            }
        }
        
        // Restore saved mute preference
        const savedMuted = localStorage.getItem('musicMuted');
        if (savedMuted !== null) {
            audio.muted = savedMuted === 'true';
        }
        
        musicPlayerInstance = audio;
        return audio;
    }
    
    // Create mini-player UI
    function createMiniPlayer() {
        if (document.getElementById('music-mini-player')) return;
        
        const miniPlayer = document.createElement('div');
        miniPlayer.id = 'music-mini-player';
        miniPlayer.className = 'mini-player music-mini-player hidden';
        miniPlayer.innerHTML = `
            <img id="mini-player-thumb" src="" alt="Album art" class="mini-player-thumb">
            <div class="mini-player-info">
                <div id="mini-player-title" class="mini-player-title">Track Title</div>
                <div id="mini-player-artist" class="mini-player-artist">Artist</div>
                <div class="mini-player-time">
                    <span id="music-current-time">0:00</span> / <span id="music-duration">0:00</span>
                    <span id="mini-download-status" class="mini-download-status"></span>
                </div>
            </div>
            <div class="mini-player-controls">
                <button id="mini-play-pause" class="mini-control-btn" aria-label="Play/Pause">
                    <i class="fas fa-pause"></i>
                </button>

                <button id="mini-prev-track" class="mini-control-btn" aria-label="Faixa anterior">
                    <i class="fas fa-step-backward"></i>
                </button>
                <button id="mini-next-track" class="mini-control-btn" aria-label="Próxima faixa">
                    <i class="fas fa-step-forward"></i>
                </button>
                
                <!-- CONTROLE DE VOLUME -->
                <div class="mini-volume-container">
                    <button class="mini-control-btn" id="mini-music-volume-btn" aria-label="Mute/Unmute">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="mini-volume-slider" id="mini-volume-slider">
                        <div class="mini-volume-fill" id="mini-volume-fill"></div>
                    </div>
                </div>
                
                <button id="mini-music-fullscreen" class="mini-control-btn" aria-label="Fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
                <button id="mini-download-track" class="mini-control-btn" aria-label="Baixar música">
                    <i class="fas fa-download"></i>
                </button>
                <button id="mini-close" class="mini-control-btn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mini-player-progress-container" id="music-progress-container">
                <div class="mini-player-progress">
                    <div class="progress-bar-mini" id="music-progress-bar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(miniPlayer);
        
        const audio = getMusicAudio();
        
        // Event listeners
        document.getElementById('mini-play-pause').addEventListener('click', togglePlayPause);
        document.getElementById('mini-prev-track').addEventListener('click', playPreviousTrack);
        document.getElementById('mini-next-track').addEventListener('click', playNextTrack);
        document.getElementById('mini-close').addEventListener('click', closeMiniPlayer);
        document.getElementById('mini-music-fullscreen').addEventListener('click', openMusicFullscreen);
        document.getElementById('mini-download-track').addEventListener('click', () => {
            if (typeof window.downloadCurrentMusic === 'function') {
                window.downloadCurrentMusic();
            }
        });
        
        // VOLUME BUTTON
        const volumeBtn = document.getElementById('mini-music-volume-btn');
        volumeBtn.addEventListener('click', () => {
            if (audio) {
                audio.muted = !audio.muted;
                updateMusicVolume();
                // Save mute preference
                localStorage.setItem('musicMuted', audio.muted.toString());
            }
        });
        
        // VOLUME SLIDER
        const volumeSlider = document.getElementById('mini-volume-slider');
        volumeSlider.addEventListener('click', (e) => {
            if (!audio) return;
            const rect = volumeSlider.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.volume = Math.max(0, Math.min(1, percent));
            audio.muted = false;
            updateMusicVolume();
            // Save volume preference
            localStorage.setItem('musicVolume', audio.volume.toString());
        });
        
        // BARRA DE PROGRESSO CLICÁVEL
        const progressContainer = document.getElementById('music-progress-container');
        progressContainer.addEventListener('click', (e) => {
            if (!audio) return;
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        });
        
        // Update play/pause icon based on audio state
        audio.addEventListener('play', updatePlayPauseIcon);
        audio.addEventListener('pause', updatePlayPauseIcon);
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('volumechange', updateMusicVolume);
        audio.addEventListener('ended', () => {
            // Auto-advance to next track
            playNextTrack();
        });
        
        // Initialize volume display
        updateMusicVolume();
        setupMediaSessionHandlers();
        updateTrackNavigationButtons();
    }
    
    function updatePlayPauseIcon() {
        const audio = getMusicAudio();
        const icon = document.querySelector('#mini-play-pause i');
        if (icon) {
            icon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
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
    
    function updateProgress() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const progressBar = document.getElementById('music-progress-bar');
        const currentTimeEl = document.getElementById('music-current-time');
        
        if (progressBar && audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = percent + '%';
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }
    
    function updateDuration() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const durationEl = document.getElementById('music-duration');
        if (durationEl) {
            durationEl.textContent = formatTime(audio.duration);
        }
    }
    
    // NOVA FUNÇÃO: Atualizar UI de volume
    function updateMusicVolume() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const volumeFill = document.getElementById('mini-volume-fill');
        const volumeBtn = document.getElementById('mini-music-volume-btn');
        
        if (volumeFill) {
            volumeFill.style.width = (audio.volume * 100) + '%';
        }
        
        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (icon) {
                if (audio.muted || audio.volume === 0) {
                    icon.className = 'fas fa-volume-mute';
                } else if (audio.volume < 0.5) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
        }
        
        // Persist volume to localStorage
        try {
            localStorage.setItem('musicVolume', audio.volume.toString());
            localStorage.setItem('musicMuted', audio.muted.toString());
        } catch(e) {
            console.warn('Could not save music volume:', e);
        }
    }
    
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    let currentMusicData = null;

    function getAllMusicCards() {
        return Array.from(document.querySelectorAll('.music-card'));
    }

    function getCurrentTrackIndex() {
        if (!currentPlayingCard) return -1;
        return getAllMusicCards().indexOf(currentPlayingCard);
    }

    function updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator) || !currentMusicData) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentMusicData.title || 'AniVerse',
                artist: currentMusicData.artist || 'AniVerse',
                album: currentMusicData.anime || 'AniVerse Music',
                artwork: [{
                    src: currentMusicData.thumbnail || 'images/bg-default.jpg',
                    sizes: '512x512',
                    type: 'image/png'
                }]
            });
        } catch (error) {
            console.warn('Media Session metadata error:', error);
        }
    }

    function updateTrackNavigationButtons() {
        const index = getCurrentTrackIndex();
        const cards = getAllMusicCards();
        const hasPrevious = index > 0;
        const hasNext = index >= 0 && index < cards.length - 1;

        ['mini-prev-track', 'music-fs-prev'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !hasPrevious;
        });

        ['mini-next-track', 'music-fs-next'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !hasNext;
        });
    }

    function refreshMusicPlayerUI() {
        if (!currentMusicData) return;

        const thumb = currentMusicData.thumbnail || 'images/bg-default.jpg';
        const title = currentMusicData.title || 'Sem título';
        const artist = currentMusicData.artist || 'Artista desconhecido';

        const miniThumb = document.getElementById('mini-player-thumb');
        const miniTitle = document.getElementById('mini-player-title');
        const miniArtist = document.getElementById('mini-player-artist');
        if (miniThumb) miniThumb.src = thumb;
        if (miniTitle) miniTitle.textContent = title;
        if (miniArtist) miniArtist.textContent = artist;

        const fsThumb = document.getElementById('music-fs-thumb');
        const fsTitle = document.getElementById('music-fs-title');
        const fsArtist = document.getElementById('music-fs-artist');
        const fsBg = document.getElementById('music-fs-bg');
        if (fsThumb) fsThumb.src = thumb;
        if (fsTitle) fsTitle.textContent = title;
        if (fsArtist) fsArtist.textContent = artist;
        if (fsBg) fsBg.style.backgroundImage = `url('${thumb}')`;

        updateTrackNavigationButtons();
        updateMediaSessionMetadata();
    }

    function setupMediaSessionHandlers() {
        if (!('mediaSession' in navigator)) return;

        const audio = getMusicAudio();
        try {
            navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
            navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
            navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            });
        } catch (error) {
            console.warn('Media Session handlers not fully supported:', error);
        }
    }
    
    function openMusicFullscreen() {
        if (!currentMusicData) return;
        
        const audio = getMusicAudio();
        
        // Criar modal fullscreen
        let fullscreenModal = document.getElementById('music-fullscreen-modal');
        
        if (!fullscreenModal) {
            fullscreenModal = document.createElement('div');
            fullscreenModal.id = 'music-fullscreen-modal';
            fullscreenModal.className = 'music-fullscreen-modal';
            fullscreenModal.innerHTML = `
                <div class="music-fullscreen-bg" id="music-fs-bg"></div>
                <button class="music-fs-close" id="music-fs-close-btn">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="music-fullscreen-content">
                    <div class="music-fs-artwork">
                        <img src="" alt="Album Art" id="music-fs-thumb">
                    </div>
                    <div class="music-fs-info">
                        <h2 id="music-fs-title">Título</h2>
                        <p id="music-fs-artist">Artista</p>
                    </div>
                    <div class="music-fs-progress-container" id="music-fs-progress-container">
                        <div class="music-fs-time">
                            <span id="music-fs-current">0:00</span>
                            <span id="music-fs-duration">0:00</span>
                        </div>
                        <div class="music-fs-progress-bar">
                            <div class="music-fs-progress-fill" id="music-fs-progress-fill"></div>
                        </div>
                    </div>
                    <div class="music-fs-controls">
                        <button class="music-fs-control-btn" id="music-fs-prev" aria-label="Faixa anterior">
                            <i class="fas fa-step-backward"></i>
                        </button>
                        <button class="music-fs-control-btn" id="music-fs-play-pause" aria-label="Reproduzir/Pausar">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="music-fs-control-btn" id="music-fs-next" aria-label="Próxima faixa">
                            <i class="fas fa-step-forward"></i>
                        </button>
                        <button class="music-fs-control-btn" id="music-fs-download" aria-label="Baixar música">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(fullscreenModal);
            
            // Event listeners
            document.getElementById('music-fs-close-btn').addEventListener('click', closeMusicFullscreen);
            document.getElementById('music-fs-play-pause').addEventListener('click', togglePlayPause);
            document.getElementById('music-fs-prev').addEventListener('click', playPreviousTrack);
            document.getElementById('music-fs-next').addEventListener('click', playNextTrack);
            document.getElementById('music-fs-download').addEventListener('click', () => {
                if (typeof window.downloadCurrentMusic === 'function') {
                    window.downloadCurrentMusic();
                }
            });
            
            const fsProgressContainer = document.getElementById('music-fs-progress-container');
            fsProgressContainer.addEventListener('click', (e) => {
                if (!audio) return;
                const progressBar = e.currentTarget.querySelector('.music-fs-progress-bar');
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.currentTime = percent * audio.duration;
            });
            
            if (audio) {
                audio.addEventListener('timeupdate', updateFullscreenProgress);
                audio.addEventListener('play', updateFullscreenPlayPauseIcon);
                audio.addEventListener('pause', updateFullscreenPlayPauseIcon);
            }
        }
        
        // Atualizar conteúdo
        refreshMusicPlayerUI();
        
        // Atualizar botão play/pause
        updateFullscreenPlayPauseIcon();
        
        fullscreenModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMusicFullscreen() {
        const fullscreenModal = document.getElementById('music-fullscreen-modal');
        if (fullscreenModal) {
            fullscreenModal.classList.remove('visible');
            document.body.style.overflow = '';
        }
    }
    
    function updateFullscreenProgress() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const fill = document.getElementById('music-fs-progress-fill');
        const currentEl = document.getElementById('music-fs-current');
        const durationEl = document.getElementById('music-fs-duration');
        
        if (fill && audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            fill.style.width = percent + '%';
        }
        
        if (currentEl) {
            currentEl.textContent = formatTime(audio.currentTime);
        }
        
        if (durationEl) {
            durationEl.textContent = formatTime(audio.duration);
        }
    }
    
    function updateFullscreenPlayPauseIcon() {
        const audio = getMusicAudio();
        const icon = document.querySelector('#music-fs-play-pause i');
        if (icon) {
            icon.className = audio && !audio.paused ? 'fas fa-pause' : 'fas fa-play';
        }
    }
    
    // Play next track in the music list
    function playNextTrack() {
        if (!currentPlayingCard) {
            closeMiniPlayer();
            return;
        }
        
        // Find all music cards
        const cardsArray = getAllMusicCards();
        const currentIndex = cardsArray.indexOf(currentPlayingCard);
        
        if (currentIndex === -1 || currentIndex >= cardsArray.length - 1) {
            // Last track or not found, stop playing
            closeMiniPlayer();
            console.log('🎵 Playlist ended');
            return;
        }
        
        // Get next card and play it
        const nextCard = cardsArray[currentIndex + 1];
        if (nextCard) {
            const src = nextCard.dataset.src;
            const title = nextCard.dataset.title;
            const artist = nextCard.dataset.artist;
            const thumb = nextCard.dataset.thumb;
            
            console.log(`⏭️ Auto-playing next track: ${title}`);
            playMusic(src, title, artist, thumb, nextCard);
        } else {
            closeMiniPlayer();
        }
    }

    function playPreviousTrack() {
        if (!currentPlayingCard) {
            return;
        }

        const cardsArray = getAllMusicCards();
        const currentIndex = cardsArray.indexOf(currentPlayingCard);

        if (currentIndex <= 0) {
            return;
        }

        const previousCard = cardsArray[currentIndex - 1];
        if (previousCard) {
            playMusic(
                previousCard.dataset.src,
                previousCard.dataset.title,
                previousCard.dataset.artist,
                previousCard.dataset.thumb,
                previousCard
            );
        }
    }
    
    function closeMiniPlayer() {
        const audio = getMusicAudio();
        audio.pause();
        audio.src = '';
        currentMusicData = null;
        
        const miniPlayer = document.getElementById('music-mini-player');
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
        
        const miniPlayer = document.getElementById('music-mini-player');
        const audio = getMusicAudio();
        
        // Store current music data for fullscreen
        currentMusicData = {
            src: src,
            title: title,
            artist: artist,
            thumbnail: thumb,
            anime: card?.closest('.music-section')?.querySelector('.music-anime-title')?.textContent || ''
        };
        
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
            if (audio.readyState < 2 && audio.paused) {
                showMusicError('Tempo de carregamento excedido. Tente novamente.');
            }
        }, 15000);
        
        // Clear timeout on various success events
        const clearLoadTimeout = () => {
            clearTimeout(loadTimeout);
        };
        
        audio.addEventListener('loadeddata', clearLoadTimeout, { once: true });
        audio.addEventListener('playing', clearLoadTimeout, { once: true });
        audio.addEventListener('canplay', clearLoadTimeout, { once: true });
        
        audio.play().catch(err => {
            clearTimeout(loadTimeout);
            console.error('Play failed:', err);
            showMusicError('Erro ao reproduzir. Clique para tentar novamente.');
        });
        
        // Update mini-player/fullscreen/system UI
        refreshMusicPlayerUI();
        
        miniPlayer.classList.remove('hidden');
        
        // Update current playing card
        currentPlayingCard = card;
        if (card) {
            card.classList.add('playing');
        }

        updateTrackNavigationButtons();
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
            // Dados ainda não carregados - aguardar evento animeDataLoaded
            // Não mostrar warning aqui pois pode ser timing normal
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
    
    // Flag to prevent duplicate event listener registration
    let musicListenerAdded = false;
    
    // Initialize when anime data is loaded
    function init() {
        // Adicionar listener apenas uma vez para evitar memory leaks
        if (!musicListenerAdded) {
            window.addEventListener('animeDataLoaded', renderMusicGrid);
            musicListenerAdded = true;
        }
        
        // Tentar renderizar imediatamente se dados já disponíveis
        if (window.animeDB && window.animeDB.musicLibrary) {
            renderMusicGrid();
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
    window.updateMusicVolume = updateMusicVolume;
})();

// Keyboard shortcuts for music player
document.addEventListener('keydown', (e) => {
    // PRIORIDADE 2: Se modal de vídeo está aberto, IGNORAR comandos de música
    const videoModal = document.getElementById('video-modal');
    if (videoModal && videoModal.style.display === 'flex') {
        return; // Não processar nada se vídeo estiver aberto
    }
    
    // Só processar se mini-player de música estiver visível
    const miniPlayer = document.getElementById('music-mini-player');
    if (!miniPlayer || miniPlayer.classList.contains('hidden')) {
        return;
    }
    
    const audio = document.getElementById('music-playing-audio');
    if (!audio) return;
    
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Prevenir ações padrão
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'm'].includes(e.key)) {
        e.preventDefault();
    }
    
    switch(e.key) {
        case ' ':
            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
            break;
            
        case 'ArrowLeft':
            audio.currentTime = Math.max(0, audio.currentTime - 5);
            break;
            
        case 'ArrowRight':
            audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
            break;
            
        case 'ArrowUp':
            audio.volume = Math.min(1, audio.volume + 0.1);
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
            
        case 'ArrowDown':
            audio.volume = Math.max(0, audio.volume - 0.1);
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
            
        case 'm':
            audio.muted = !audio.muted;
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
    }
});
