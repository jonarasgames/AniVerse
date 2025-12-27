document.addEventListener('DOMContentLoaded', function() {
    // First, inject music player UI if not present
    const musicPlayerContainer = document.getElementById('music-player-container');
    if (musicPlayerContainer && !document.getElementById('music-grid')) {
        musicPlayerContainer.innerHTML = `
            <div class="music-tabs">
                <button class="music-tab active" data-section="themes">Openings & Endings</button>
                <button class="music-tab" data-section="osts">OSTs</button>
            </div>
            <div id="music-grid-container" class="active">
                <div id="music-grid" class="music-grid"></div>
            </div>
            <div id="osts-container">
                <div id="osts-grid" class="osts-grid"></div>
            </div>
        `;
    }
    
    // Also inject music modal and mini-player if not present
    if (!document.getElementById('music-modal')) {
        const musicModalHTML = `
            <div id="music-modal" class="modal music-modal" style="display: none;">
                <div class="modal-content music-modal-content">
                    <span class="close-modal" id="close-music-modal">&times;</span>
                    <div class="music-player-full">
                        <img id="music-cover-img" src="" alt="Cover">
                        <h2 id="music-title">Título</h2>
                        <p id="music-artist">Artista</p>
                        <p id="music-anime">Anime</p>
                        <div class="progress-container"></div>
                        <div class="music-time">
                            <span id="music-current-time">0:00</span>
                            <span id="music-duration">0:00</span>
                        </div>
                        <div class="music-controls">
                            <button id="shuffle-btn"><i class="fas fa-random"></i></button>
                            <button id="music-prev"><i class="fas fa-step-backward"></i></button>
                            <button id="music-play"><i class="fas fa-play"></i></button>
                            <button id="music-next"><i class="fas fa-step-forward"></i></button>
                            <button id="repeat-btn"><i class="fas fa-redo"></i></button>
                        </div>
                        <div class="volume-control-container">
                            <i class="fas fa-volume-up"></i>
                            <input type="range" id="volume-control" min="0" max="1" step="0.1" value="1">
                        </div>
                    </div>
                </div>
            </div>
            <div id="mini-player" class="mini-player">
                <div class="mini-player-content">
                    <img id="mini-cover-img" src="" alt="Cover">
                    <div class="mini-info">
                        <div id="mini-title">Título</div>
                        <div id="mini-artist">Artista</div>
                    </div>
                    <div class="mini-controls">
                        <button id="mini-play"><i class="fas fa-play"></i></button>
                        <button id="mini-fullscreen"><i class="fas fa-expand"></i></button>
                        <button id="mini-close"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="mini-progress-container"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', musicModalHTML);
    }
    
    const elements = {
        musicModal: document.getElementById('music-modal'),
        miniPlayer: document.getElementById('mini-player'),
        playBtn: document.getElementById('music-play'),
        miniPlayBtn: document.getElementById('mini-play'),
        prevBtn: document.getElementById('music-prev'),
        nextBtn: document.getElementById('music-next'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        repeatBtn: document.getElementById('repeat-btn'),
        progressBar: document.getElementById('music-progress'),
        currentTimeEl: document.getElementById('music-current-time'),
        durationEl: document.getElementById('music-duration'),
        coverImg: document.getElementById('music-cover-img'),
        miniCoverImg: document.getElementById('mini-cover-img'),
        musicTitle: document.getElementById('music-title'),
        miniTitle: document.getElementById('mini-title'),
        musicArtist: document.getElementById('music-artist'),
        miniArtist: document.getElementById('mini-artist'),
        musicAnime: document.getElementById('music-anime'),
        musicTabs: document.querySelectorAll('.music-tab'),
        musicGrid: document.getElementById('music-grid'),
        ostsGrid: document.getElementById('osts-grid'),
        musicGridContainer: document.getElementById('music-grid-container'),
        ostsContainer: document.getElementById('osts-container'),
        closeModalBtn: document.getElementById('close-music-modal'),
        miniCloseBtn: document.getElementById('mini-close'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        miniFullscreenBtn: document.getElementById('mini-fullscreen'),
        volumeControl: document.getElementById('volume-control'),
        progressContainer: document.querySelector('.progress-container'),
        miniProgressContainer: document.querySelector('.mini-progress-container'),
        progressBarFill: document.createElement('div'),
        miniProgressBarFill: document.createElement('div')
    };

    // Adiciona as barras de progresso visuais se os containers existirem
    if (elements.progressContainer) {
        elements.progressContainer.appendChild(elements.progressBarFill);
        elements.progressBarFill.classList.add('progress-bar');
    }
    
    if (elements.miniProgressContainer) {
        elements.miniProgressContainer.appendChild(elements.miniProgressBarFill);
        elements.miniProgressBarFill.classList.add('mini-progress-bar');
    }

    const musicPlayer = new Audio();
    let currentTrack = 0;
    let currentPlaylist = [];
    let isPlaying = false;
    let isShuffled = false;
    let isRepeated = false;
    let shuffledPlaylist = [];

    function waitForAnimeDB(callback) {
        if (window.animeDB && animeDB.getMusicLibrary) {
            callback();
        } else {
            setTimeout(() => waitForAnimeDB(callback), 100);
        }
    }

    function loadMusic(type) {
        const library = animeDB.getMusicLibrary();
        
        if (type === 'osts') {
            currentPlaylist = [];
            renderAlbums(library.osts);
            if (elements.musicGridContainer) {
                elements.musicGridContainer.classList.remove('active');
            }
            if (elements.ostsContainer) {
                elements.ostsContainer.classList.add('active');
            }
        } else {
            currentPlaylist = library.themes;
            renderMusicGrid(library.themes);
            if (elements.musicGridContainer) {
                elements.musicGridContainer.classList.add('active');
            }
            if (elements.ostsContainer) {
                elements.ostsContainer.classList.remove('active');
            }
        }
    }

    function renderAlbums(osts) {
        if (!elements.ostsGrid) return;
        
        elements.ostsGrid.innerHTML = '';
        
        for (const [album, data] of Object.entries(osts)) {
            const albumHTML = `
                <div class="album-section">
                    <div class="album-header">
                        <div class="album-cover">
                            <img src="${data.cover}" loading="lazy">
                        </div>
                        <div class="album-info">
                            <h3 class="album-title">${album}</h3>
                            <p class="album-year">${data.year}</p>
                        </div>
                    </div>
                    <div class="album-tracks">
                        ${data.tracks.map((track, index) => `
                            <div class="track-item" data-album="${album}" data-index="${index}">
                                <div class="track-number">${index + 1}</div>
                                <div class="track-info">
                                    <div class="track-title">${track.title}</div>
                                    <div class="track-artist">${track.artist}</div>
                                </div>
                                <div class="track-duration">${formatTime(track.duration)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            elements.ostsGrid.innerHTML += albumHTML;
        }

        elements.ostsGrid.querySelectorAll('.track-item').forEach(track => {
            track.addEventListener('click', function() {
                const album = this.dataset.album;
                currentPlaylist = osts[album].tracks;
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                showMusicModal();
            });
        });
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function renderMusicGrid(tracks) {
        if (!elements.musicGrid) return;
        
        elements.musicGrid.innerHTML = '';
        const animeGroups = {};

        tracks.forEach((track, index) => {
            if (!animeGroups[track.anime]) {
                animeGroups[track.anime] = [];
            }
            animeGroups[track.anime].push({...track, originalIndex: index});
        });

        for (const [anime, tracks] of Object.entries(animeGroups)) {
            const animeSection = document.createElement('div');
            animeSection.className = 'anime-music-section';
            
            animeSection.innerHTML = `
                <div class="anime-header">
                    <h2>${anime}</h2>
                </div>
                <div class="anime-music-grid">
                    ${tracks.map(track => `
                        <div class="music-card" data-index="${track.originalIndex}">
                            <div class="music-cover">
                                <img src="${track.cover}" loading="lazy">
                                <span class="music-type ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                            </div>
                            <div class="music-info">
                                <h3 class="music-title">${track.title}</h3>
                                <p class="music-artist">${track.artist}</p>
                                <p class="music-anime">${track.anime}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            elements.musicGrid.appendChild(animeSection);
        }

        elements.musicGrid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', function() {
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                showMusicModal();
            });
        });
    }

    function showMusicModal() {
        if (elements.musicModal) {
            elements.musicModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideMusicModal() {
        if (elements.musicModal) {
            elements.musicModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function playTrack() {
        const track = currentPlaylist[currentTrack];
        if (!track) return;

        musicPlayer.src = track.audio;
        if (elements.coverImg) elements.coverImg.src = track.cover;
        if (elements.miniCoverImg) elements.miniCoverImg.src = track.cover;
        if (elements.musicTitle) elements.musicTitle.textContent = track.title;
        if (elements.miniTitle) elements.miniTitle.textContent = track.title;
        if (elements.musicArtist) elements.musicArtist.textContent = track.artist;
        if (elements.miniArtist) elements.miniArtist.textContent = track.artist;
        if (elements.musicAnime) elements.musicAnime.textContent = track.anime;

        musicPlayer.play()
            .then(() => {
                isPlaying = true;
                updatePlayButtons();
                showMiniPlayer();
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }

    function showMiniPlayer() {
        if (elements.miniPlayer) {
            elements.miniPlayer.classList.add('active');
        }
    }

    function hideMiniPlayer() {
        if (elements.miniPlayer) {
            elements.miniPlayer.classList.remove('active');
        }
    }

    function togglePlay() {
        if (musicPlayer.paused) {
            musicPlayer.play().then(() => {
                isPlaying = true;
                updatePlayButtons();
            });
        } else {
            musicPlayer.pause();
            isPlaying = false;
            updatePlayButtons();
        }
    }

    function updatePlayButtons() {
        const icon = isPlaying ? 'pause' : 'play';
        if (elements.playBtn) elements.playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        if (elements.miniPlayBtn) elements.miniPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    function nextTrack() {
        if (isShuffled) {
            currentTrack = (currentTrack + 1) % shuffledPlaylist.length;
            currentTrack = shuffledPlaylist[currentTrack];
        } else {
            currentTrack = (currentTrack + 1) % currentPlaylist.length;
        }
        playTrack();
    }

    function prevTrack() {
        if (musicPlayer.currentTime > 3) {
            musicPlayer.currentTime = 0;
            return;
        }

        if (isShuffled) {
            currentTrack = (currentTrack - 1 + shuffledPlaylist.length) % shuffledPlaylist.length;
            currentTrack = shuffledPlaylist[currentTrack];
        } else {
            currentTrack = (currentTrack - 1 + currentPlaylist.length) % currentPlaylist.length;
        }
        playTrack();
    }

    function toggleShuffle() {
        isShuffled = !isShuffled;
        if (elements.shuffleBtn) {
            elements.shuffleBtn.classList.toggle('active', isShuffled);
        }
        
        if (isShuffled) {
            shuffledPlaylist = [...Array(currentPlaylist.length).keys()];
            for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]];
            }
            shuffledPlaylist = shuffledPlaylist.filter(idx => idx !== currentTrack);
            shuffledPlaylist.unshift(currentTrack);
        }
    }

    function toggleRepeat() {
        isRepeated = !isRepeated;
        if (elements.repeatBtn) {
            elements.repeatBtn.classList.toggle('active', isRepeated);
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (elements.musicModal && elements.musicModal.requestFullscreen) {
                elements.musicModal.requestFullscreen().catch(err => {
                    console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
                });
            }
        } else {
            document.exitFullscreen();
        }
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = musicPlayer.duration;
        musicPlayer.currentTime = (clickX / width) * duration;
    }

    function updateVolumeIcon(volume) {
        const volumeIcon = elements.volumeControl.querySelector('i');
        if (volumeIcon) {
            if (volume == 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        }
    }

    waitForAnimeDB(() => {
        // Expose loadMusic globally
        window.loadMusic = loadMusic;
        
        // Guard NodeLists - default to empty array if not found
        const musicTabs = elements.musicTabs || [];
        musicTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                musicTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });

        // Guard event listener attachments
        if (elements.playBtn) elements.playBtn.addEventListener('click', togglePlay);
        if (elements.miniPlayBtn) elements.miniPlayBtn.addEventListener('click', togglePlay);
        if (elements.nextBtn) elements.nextBtn.addEventListener('click', nextTrack);
        if (elements.prevBtn) elements.prevBtn.addEventListener('click', prevTrack);
        if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', toggleShuffle);
        if (elements.repeatBtn) elements.repeatBtn.addEventListener('click', toggleRepeat);
        if (elements.fullscreenBtn) elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        if (elements.miniFullscreenBtn) elements.miniFullscreenBtn.addEventListener('click', showMusicModal);
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', hideMusicModal);
        if (elements.miniCloseBtn) {
            elements.miniCloseBtn.addEventListener('click', () => {
                musicPlayer.pause();
                isPlaying = false;
                updatePlayButtons();
                hideMiniPlayer();
            });
        }

        if (elements.progressContainer) {
            elements.progressContainer.addEventListener('click', setProgress);
        }
        if (elements.miniProgressContainer) {
            elements.miniProgressContainer.addEventListener('click', setProgress);
        }

        if (elements.volumeControl) {
            elements.volumeControl.addEventListener('input', function() {
                musicPlayer.volume = this.value;
                updateVolumeIcon(this.value);
            });
            musicPlayer.volume = elements.volumeControl.value;
            updateVolumeIcon(elements.volumeControl.value);
        }

        musicPlayer.addEventListener('ended', () => {
            if (isRepeated) {
                musicPlayer.currentTime = 0;
                musicPlayer.play();
            } else {
                nextTrack();
            }
        });

        musicPlayer.addEventListener('timeupdate', function() {
            if (!isNaN(musicPlayer.duration)) {
                const mins = Math.floor(musicPlayer.currentTime / 60);
                const secs = Math.floor(musicPlayer.currentTime % 60);
                if (elements.currentTimeEl) {
                    elements.currentTimeEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                }
                
                const totalMins = Math.floor(musicPlayer.duration / 60);
                const totalSecs = Math.floor(musicPlayer.duration % 60);
                if (elements.durationEl) {
                    elements.durationEl.textContent = `${totalMins}:${totalSecs < 10 ? '0' : ''}${totalSecs}`;
                }
                
                const progressPercent = (musicPlayer.currentTime / musicPlayer.duration) * 100;
                if (elements.progressBarFill) {
                    elements.progressBarFill.style.width = `${progressPercent}%`;
                }
                if (elements.miniProgressBarFill) {
                    elements.miniProgressBarFill.style.width = `${progressPercent}%`;
                }
            }
        });

        const firstTab = document.querySelector('.music-tab');
        if (firstTab) firstTab.click();
    });
});
