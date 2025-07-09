document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const elements = {
        musicModal: document.getElementById('music-modal'),
        miniPlayer: document.getElementById('mini-player'),
        playBtn: document.getElementById('music-play'),
        miniPlayBtn: document.getElementById('mini-play'),
        prevBtn: document.getElementById('music-prev'),
        nextBtn: document.getElementById('music-next'),
        shuffleBtn: document.getElementById('music-shuffle'),
        repeatBtn: document.getElementById('music-repeat'),
        miniPrevBtn: document.getElementById('mini-prev'),
        miniNextBtn: document.getElementById('mini-next'),
        miniShuffleBtn: document.getElementById('mini-shuffle'),
        miniRepeatBtn: document.getElementById('mini-repeat'),
        progressBar: document.getElementById('music-progress'),
        miniProgressBar: document.getElementById('mini-progress'),
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
        endingsGrid: document.getElementById('endings-grid'),
        ostsGrid: document.getElementById('osts-grid'),
        currentMusicGrid: document.getElementById('current-music-grid-content'),
        closeModalBtn: document.getElementById('close-music-modal'),
        miniCloseBtn: document.getElementById('mini-close'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        miniFullscreenBtn: document.getElementById('mini-fullscreen')
    };

    const musicPlayer = new Audio();
    let currentTrack = 0;
    let currentPlaylist = [];
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    let isFullscreen = false;
    let originalPlaylist = [];

    // Verifica se o animeDB está pronto
    function waitForAnimeDB(callback) {
        if (window.animeDB && animeDB.getMusicLibrary) {
            console.log("animeDB pronto!");
            callback();
        } else {
            console.log("Aguardando animeDB...");
            setTimeout(() => waitForAnimeDB(callback), 100);
        }
    }

    // Carrega a seção de músicas
    function loadMusic(type) {
        const library = animeDB.getMusicLibrary();
        
        // Esconde todos os grids primeiro
        document.querySelectorAll('.music-grid-container').forEach(container => {
            container.classList.remove('active');
        });
        
        if (type === 'osts') {
            currentPlaylist = [];
            renderAlbums(library.osts);
            document.getElementById('osts-grid-container').classList.add('active');
        } else if (type === 'endings') {
            currentPlaylist = library.themes.filter(t => t.type === 'ending');
            renderMusicGrid(currentPlaylist, 'endings');
            document.getElementById('endings-grid-container').classList.add('active');
        } else { // openings
            currentPlaylist = library.themes.filter(t => t.type === 'opening');
            renderMusicGrid(currentPlaylist, 'openings');
            document.getElementById('music-grid-container').classList.add('active');
        }
    }

    // Renderiza os álbuns
    function renderAlbums(osts) {
        elements.ostsGrid.innerHTML = '';
        
        for (const [album, data] of Object.entries(osts)) {
            const albumHTML = `
                <div class="album-section">
                    <div class="album-header">
                        <div class="album-cover">
                            <img src="${data.cover}" loading="lazy">
                        </div>
                        <div>
                            <h3>${album}</h3>
                            <p>${data.year}</p>
                        </div>
                    </div>
                    <div class="music-grid">
                        ${data.tracks.map((track, index) => `
                            <div class="music-card" data-index="${index}">
                                <div class="music-card-cover">
                                    <img src="${data.cover}" loading="lazy">
                                    <span class="music-type-badge">OST</span>
                                </div>
                                <div class="music-card-info">
                                    <h3 class="music-card-title">${track.title}</h3>
                                    <p class="music-card-artist">${track.artist}</p>
                                    <p class="music-card-anime">${album}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            elements.ostsGrid.innerHTML += albumHTML;
        }

        // Adiciona eventos aos cards
        elements.ostsGrid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', function() {
                const album = this.closest('.album-section').querySelector('h3').textContent;
                currentPlaylist = osts[album].tracks;
                originalPlaylist = [...currentPlaylist];
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                openMusicModal();
            });
        });
    }

    // Renderiza a grid de músicas agrupadas por anime
    function renderMusicGrid(tracks, type) {
        const grid = type === 'endings' ? elements.endingsGrid : elements.musicGrid;
        grid.innerHTML = '';
        
        // Agrupa por anime
        const animeGroups = {};
        tracks.forEach(track => {
            if (!animeGroups[track.anime]) {
                animeGroups[track.anime] = [];
            }
            animeGroups[track.anime].push(track);
        });
        
        // Renderiza cada grupo
        for (const [anime, tracks] of Object.entries(animeGroups)) {
            // Cabeçalho do anime
            grid.innerHTML += `
                <div class="anime-header">
                    <h2>${anime}</h2>
                </div>
            `;
            
            // Músicas do anime
            tracks.forEach((track, index) => {
                const trackIndex = currentPlaylist.findIndex(t => t.title === track.title && t.artist === track.artist);
                grid.innerHTML += `
                    <div class="music-card" data-index="${trackIndex}">
                        <div class="music-card-cover">
                            <img src="${track.cover}" loading="lazy">
                            <span class="music-type-badge">${type === 'openings' ? 'OP' : 'ED'}</span>
                        </div>
                        <div class="music-card-info">
                            <h3 class="music-card-title">${track.title}</h3>
                            <p class="music-card-artist">${track.artist}</p>
                            <p class="music-card-anime">${anime}</p>
                        </div>
                    </div>
                `;
            });
        }

        // Adiciona eventos aos cards
        grid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', function() {
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                openMusicModal();
            });
        });
    }

    // Atualiza a grid de músicas atual no modal
    function updateCurrentMusicGrid() {
        elements.currentMusicGrid.innerHTML = '';
        
        currentPlaylist.forEach((track, index) => {
            const isActive = index === currentTrack;
            elements.currentMusicGrid.innerHTML += `
                <div class="music-card ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="music-card-cover">
                        <img src="${track.cover}" loading="lazy">
                        <span class="music-type-badge">${track.type === 'opening' ? 'OP' : track.type === 'ending' ? 'ED' : 'OST'}</span>
                    </div>
                    <div class="music-card-info">
                        <h3 class="music-card-title">${track.title}</h3>
                        <p class="music-card-artist">${track.artist}</p>
                        <p class="music-card-anime">${track.anime}</p>
                    </div>
                </div>
            `;
        });

        // Adiciona eventos aos cards
        elements.currentMusicGrid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', function() {
                currentTrack = parseInt(this.dataset.index);
                playTrack();
            });
        });
    }

    // Toca a música selecionada
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
                elements.miniPlayer.classList.add('active');
                updateCurrentMusicGrid();
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }

    // Abre o modal de música
    function openMusicModal() {
        elements.musicModal.style.display = 'flex';
        updateCurrentMusicGrid();
    }

    // Fecha o modal de música
    function closeMusicModal() {
        elements.musicModal.style.display = 'none';
    }

    // Alterna entre tela cheia
    function toggleFullscreen() {
        if (!isFullscreen) {
            elements.musicModal.style.position = 'fixed';
            elements.musicModal.style.zIndex = '9999';
            elements.musicModal.style.width = '100%';
            elements.musicModal.style.height = '100%';
            elements.musicModal.style.padding = '0';
            document.body.style.overflow = 'hidden';
            isFullscreen = true;
        } else {
            elements.musicModal.style.position = '';
            elements.musicModal.style.zIndex = '';
            elements.musicModal.style.width = '';
            elements.musicModal.style.height = '';
            elements.musicModal.style.padding = '';
            document.body.style.overflow = '';
            isFullscreen = false;
        }
    }

    // Controles do player
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
        if (isShuffle && currentPlaylist.length > 1) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * currentPlaylist.length);
            } while (newIndex === currentTrack);
            currentTrack = newIndex;
        } else {
            currentTrack = (currentTrack + 1) % currentPlaylist.length;
        }
        playTrack();
    }

    function prevTrack() {
        if (musicPlayer.currentTime > 3) {
            musicPlayer.currentTime = 0;
        } else {
            currentTrack = (currentTrack - 1 + currentPlaylist.length) % currentPlaylist.length;
            playTrack();
        }
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        elements.shuffleBtn.classList.toggle('active', isShuffle);
        elements.miniShuffleBtn.classList.toggle('active', isShuffle);
        
        if (isShuffle) {
            originalPlaylist = [...currentPlaylist];
            // Embaralha a playlist atual
            for (let i = currentPlaylist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
            }
            // Garante que a música atual continue sendo a primeira
            const currentSong = currentPlaylist[currentTrack];
            currentPlaylist = currentPlaylist.filter((_, index) => index !== currentTrack);
            currentPlaylist.unshift(currentSong);
            currentTrack = 0;
        } else {
            currentPlaylist = [...originalPlaylist];
            // Encontra a posição da música atual na playlist original
            currentTrack = originalPlaylist.findIndex(
                song => song.audio === currentPlaylist[0].audio
            );
        }
        updateCurrentMusicGrid();
    }

    function toggleRepeat() {
        isRepeat = !isRepeat;
        elements.repeatBtn.classList.toggle('active', isRepeat);
        elements.miniRepeatBtn.classList.toggle('active', isRepeat);
    }

    function closeMiniPlayer() {
        elements.miniPlayer.classList.remove('active');
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButtons();
    }

    // Inicialização
    waitForAnimeDB(() => {
        // Configura as tabs principais
        document.querySelectorAll('.music-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });

        // Configura os botões de controle
        elements.playBtn.addEventListener('click', togglePlay);
        elements.miniPlayBtn.addEventListener('click', togglePlay);
        elements.nextBtn.addEventListener('click', nextTrack);
        elements.prevBtn.addEventListener('click', prevTrack);
        elements.shuffleBtn.addEventListener('click', toggleShuffle);
        elements.repeatBtn.addEventListener('click', toggleRepeat);
        elements.miniNextBtn.addEventListener('click', nextTrack);
        elements.miniPrevBtn.addEventListener('click', prevTrack);
        elements.miniShuffleBtn.addEventListener('click', toggleShuffle);
        elements.miniRepeatBtn.addEventListener('click', toggleRepeat);
        elements.closeModalBtn.addEventListener('click', closeMusicModal);
        elements.miniCloseBtn.addEventListener('click', closeMiniPlayer);
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        elements.miniFullscreenBtn.addEventListener('click', toggleFullscreen);

        // Barra de progresso
        elements.progressBar.addEventListener('input', function() {
            const percent = this.value / 100;
            musicPlayer.currentTime = percent * musicPlayer.duration;
        });

        elements.miniProgressBar.addEventListener('input', function() {
            const percent = this.value / 100;
            musicPlayer.currentTime = percent * musicPlayer.duration;
        });

        // Evento quando a música termina
        musicPlayer.addEventListener('ended', function() {
            if (isRepeat) {
                musicPlayer.currentTime = 0;
                musicPlayer.play();
            } else {
                nextTrack();
            }
        });

        // Atualiza o tempo da música
        musicPlayer.addEventListener('timeupdate', function() {
            if (!isNaN(musicPlayer.duration)) {
                const mins = Math.floor(musicPlayer.currentTime / 60);
                const secs = Math.floor(musicPlayer.currentTime % 60);
                elements.currentTimeEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                
                const totalMins = Math.floor(musicPlayer.duration / 60);
                const totalSecs = Math.floor(musicPlayer.duration % 60);
                elements.durationEl.textContent = `${totalMins}:${totalSecs < 10 ? '0' : ''}${totalSecs}`;
                
                const progressPercent = (musicPlayer.currentTime / musicPlayer.duration) * 100;
                elements.progressBar.value = progressPercent;
                elements.miniProgressBar.value = progressPercent;
            }
        });

        // Carrega as openings por padrão
        document.querySelector('.music-tab[data-section="openings"]').click();
    });
});
