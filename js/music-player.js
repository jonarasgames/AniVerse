document.addEventListener('DOMContentLoaded', function() {
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

    // Adiciona as barras de progresso visuais
    elements.progressContainer.appendChild(elements.progressBarFill);
    elements.progressBarFill.classList.add('progress-bar');
    
    elements.miniProgressContainer.appendChild(elements.miniProgressBarFill);
    elements.miniProgressBarFill.classList.add('mini-progress-bar');

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
            elements.musicGridContainer.classList.remove('active');
            elements.ostsContainer.classList.add('active');
        } else {
            currentPlaylist = library.themes;
            renderMusicGrid(library.themes);
            elements.musicGridContainer.classList.add('active');
            elements.ostsContainer.classList.remove('active');
        }
    }

    function renderAlbums(osts) {
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
        elements.musicModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideMusicModal() {
        elements.musicModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function playTrack() {
        const track = currentPlaylist[currentTrack];
        if (!track) return;

        musicPlayer.src = track.audio;
        elements.coverImg.src = track.cover;
        elements.miniCoverImg.src = track.cover;
        elements.musicTitle.textContent = track.title;
        elements.miniTitle.textContent = track.title;
        elements.musicArtist.textContent = track.artist;
        elements.miniArtist.textContent = track.artist;
        elements.musicAnime.textContent = track.anime;

        musicPlayer.play()
            .then(() => {
                isPlaying = true;
                updatePlayButtons();
                showMiniPlayer();
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }

    function showMiniPlayer() {
        elements.miniPlayer.classList.add('active');
    }

    function hideMiniPlayer() {
        elements.miniPlayer.classList.remove('active');
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
        elements.playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        elements.miniPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
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
        elements.shuffleBtn.classList.toggle('active', isShuffled);
        
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
        elements.repeatBtn.classList.toggle('active', isRepeated);
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            elements.musicModal.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
            });
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
        elements.musicTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                elements.musicTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });

        elements.playBtn.addEventListener('click', togglePlay);
        elements.miniPlayBtn.addEventListener('click', togglePlay);
        elements.nextBtn.addEventListener('click', nextTrack);
        elements.prevBtn.addEventListener('click', prevTrack);
        elements.shuffleBtn.addEventListener('click', toggleShuffle);
        elements.repeatBtn.addEventListener('click', toggleRepeat);
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        elements.miniFullscreenBtn.addEventListener('click', showMusicModal);
        elements.closeModalBtn.addEventListener('click', hideMusicModal);
        elements.miniCloseBtn.addEventListener('click', () => {
            musicPlayer.pause();
            isPlaying = false;
            updatePlayButtons();
            hideMiniPlayer();
        });

        elements.progressContainer.addEventListener('click', setProgress);
        elements.miniProgressContainer.addEventListener('click', setProgress);

        elements.volumeControl.addEventListener('input', function() {
            musicPlayer.volume = this.value;
            updateVolumeIcon(this.value);
        });

        musicPlayer.volume = elements.volumeControl.value;
        updateVolumeIcon(elements.volumeControl.value);

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
                elements.currentTimeEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                
                const totalMins = Math.floor(musicPlayer.duration / 60);
                const totalSecs = Math.floor(musicPlayer.duration % 60);
                elements.durationEl.textContent = `${totalMins}:${totalSecs < 10 ? '0' : ''}${totalSecs}`;
                
                const progressPercent = (musicPlayer.currentTime / musicPlayer.duration) * 100;
                elements.progressBarFill.style.width = `${progressPercent}%`;
                elements.miniProgressBarFill.style.width = `${progressPercent}%`;
            }
        });

        document.querySelector('.music-tab').click();
    });
});
