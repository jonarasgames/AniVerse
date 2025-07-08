
document.addEventListener('DOMContentLoaded', function() {
    const musicModal = document.getElementById('music-modal');
    const musicPlayer = new Audio();
    const miniPlayer = document.getElementById('mini-player');
    const playBtn = document.getElementById('music-play');
    const miniPlayBtn = document.getElementById('mini-play');
    const prevBtn = document.getElementById('music-prev');
    const nextBtn = document.getElementById('music-next');
    const miniCloseBtn = document.getElementById('mini-close');
    const progressBar = document.getElementById('music-progress');
    const currentTimeEl = document.getElementById('music-current-time');
    const durationEl = document.getElementById('music-duration');
    const coverImg = document.getElementById('music-cover-img');
    const miniCoverImg = document.getElementById('mini-cover-img');
    const musicTitle = document.getElementById('music-title');
    const miniTitle = document.getElementById('mini-title');
    const musicArtist = document.getElementById('music-artist');
    const miniArtist = document.getElementById('mini-artist');
    const musicAnime = document.getElementById('music-anime');
    
    let currentTrack = 0;
    let currentPlaylist = [];
    let currentType = '';
    let isPlaying = false;

    // Biblioteca de músicas
    let musicLibrary = { themes: [], osts: {} };

    // Função para processar os dados dos animes
    function processMusicLibrary(animes) {
        musicLibrary = { themes: [], osts: {} };

        animes.forEach(anime => {
            // Processar openings
            if (anime.openings && anime.openings.length > 0) {
                anime.openings.forEach(opening => {
                    musicLibrary.themes.push({
                        title: opening.title,
                        artist: opening.artist || 'Artista Desconhecido',
                        anime: anime.title,
                        cover: opening.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                        audio: opening.audio,
                        type: "opening"
                    });
                });
            }
            
            // Processar endings
            if (anime.endings && anime.endings.length > 0) {
                anime.endings.forEach(ending => {
                    musicLibrary.themes.push({
                        title: ending.title,
                        artist: ending.artist || 'Artista Desconhecido',
                        anime: anime.title,
                        cover: ending.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                        audio: ending.audio,
                        type: "ending"
                    });
                });
            }
            
            // Processar OSTs
            if (anime.osts && Array.isArray(anime.osts)) {
                anime.osts.forEach(ost => {
                    if (!musicLibrary.osts[ost.album]) {
                        musicLibrary.osts[ost.album] = {
                            year: ost.year || "",
                            cover: ost.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                            tracks: []
                        };
                    }
                    musicLibrary.osts[ost.album].tracks.push({
                        title: ost.title,
                        artist: ost.artist || 'Artista Desconhecido',
                        anime: anime.title,
                        audio: ost.audio
                    });
                });
            }
        });

        // Ordenar por anime e tipo
        musicLibrary.themes.sort((a, b) => {
            if (a.anime < b.anime) return -1;
            if (a.anime > b.anime) return 1;
            return a.type === 'opening' ? -1 : 1;
        });
    }

    // Carregar a lista de músicas
    function loadMusic(type) {
        currentType = type;

        // Esconde todas as grids
        document.querySelectorAll('.music-grid-container').forEach(el => {
            el.style.display = 'none';
        });

        // Mostra a grid selecionada
        const gridContainer = document.getElementById(`${type}-container`);
        if (gridContainer) gridContainer.style.display = 'block';

        if (type === 'osts') {
            renderAlbums(musicLibrary.osts);
        } else {
            currentPlaylist = musicLibrary.themes;
            renderMusicGrid(type, musicLibrary.themes);
        }
    }
    
    // Renderizar álbuns (para OSTs)
    function renderAlbums(albums) {
        const grid = document.getElementById('osts-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (const [albumName, albumData] of Object.entries(albums)) {
            const albumSection = document.createElement('div');
            albumSection.className = 'album-section';
            
            albumSection.innerHTML = `
                <div class="album-header">
                    <div class="album-cover">
                        <img src="${albumData.cover}" alt="${albumName}" loading="lazy">
                    </div>
                    <div>
                        <h3 class="album-title">${albumName}</h3>
                        <p class="album-year">${albumData.year}</p>
                    </div>
                </div>
                <div class="music-grid" id="album-${albumName.replace(/\s+/g, '-')}"></div>
            `;
            
            grid.appendChild(albumSection);
            
            // Renderizar músicas do álbum
            const albumGrid = albumSection.querySelector('.music-grid');
            albumData.tracks.forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.album = albumName;
                card.dataset.index = index;
                
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${albumData.cover}" alt="${track.title}" loading="lazy">
                    </div>
                    <div class="music-info">
                        <h3 class="music-title">${track.title}</h3>
                        <p class="music-artist">${track.artist}</p>
                        <p class="music-anime">${track.anime}</p>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    currentPlaylist = albumData.tracks;
                    currentTrack = index;
                    playTrack();
                    musicModal.style.display = 'block';
                });
                
                albumGrid.appendChild(card);
            });
        }
    }
    
    // Renderizar a grid de músicas (openings + endings)
    function renderMusicGrid(type, tracks) {
        const grid = document.getElementById(`${type}-grid`);
        if (!grid) return;

        grid.innerHTML = '';
        let currentAnime = '';

        tracks.forEach((track, index) => {
            if (track.anime !== currentAnime) {
                currentAnime = track.anime;
                const header = document.createElement('div');
                header.className = 'anime-header';
                header.innerHTML = `
                    <h2>${currentAnime}</h2>
                    <span class="anime-theme-badge ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                `;
                grid.appendChild(header);
            }

            const card = document.createElement('div');
            card.className = 'music-card';
            card.dataset.index = index;

            card.innerHTML = `
                <div class="music-cover">
                    <img src="${track.cover}" alt="${track.title}" loading="lazy">
                    <span class="music-type ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                </div>
                <div class="music-info">
                    <h3 class="music-title">${track.title}</h3>
                    <p class="music-artist">${track.artist}</p>
                    <p class="music-anime">${track.anime}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                currentTrack = index;
                playTrack();
                musicModal.style.display = 'block';
            });

            grid.appendChild(card);
        });
    }
    
    // Tocar música
    function playTrack() {
        const track = currentPlaylist[currentTrack];
        
        if (!track || !track.audio) {
            console.error('Track or audio URL is missing');
            return;
        }
        
        musicPlayer.src = track.audio;
        coverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        miniCoverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        musicTitle.textContent = track.title;
        miniTitle.textContent = track.title;
        musicArtist.textContent = track.artist;
        miniArtist.textContent = track.artist;
        musicAnime.textContent = track.anime || '';
        
        musicPlayer.play()
            .then(() => {
                isPlaying = true;
                updatePlayButtons();
                miniPlayer.classList.add('active');
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }
    
    // Atualizar botões de play/pause
    function updatePlayButtons() {
        if (isPlaying) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
    
    // Atualizar barra de progresso
    function updateProgress() {
        const { currentTime, duration } = musicPlayer;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = progressPercent;
        
        // Formatar tempo
        const currentMinutes = Math.floor(currentTime / 60);
        const currentSeconds = Math.floor(currentTime % 60);
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
        
        const durationMinutes = Math.floor(duration / 60);
        const durationSeconds = Math.floor(duration % 60);
        durationEl.textContent = `${durationMinutes}:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`;
    }
    
    // Definir progresso da música
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = musicPlayer.duration;
        musicPlayer.currentTime = (clickX / width) * duration;
    }
    
    // Event listeners
    playBtn.addEventListener('click', togglePlay);
    miniPlayBtn.addEventListener('click', togglePlay);
    
    function togglePlay() {
        if (musicPlayer.paused) {
            musicPlayer.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayButtons();
                });
        } else {
            musicPlayer.pause();
            isPlaying = false;
            updatePlayButtons();
        }
    }
    
    prevBtn.addEventListener('click', () => {
        currentTrack--;
        if (currentTrack < 0) currentTrack = currentPlaylist.length - 1;
        playTrack();
    });
    
    nextBtn.addEventListener('click', () => {
        currentTrack++;
        if (currentTrack > currentPlaylist.length - 1) currentTrack = 0;
        playTrack();
    });
    
    miniCloseBtn.addEventListener('click', () => {
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButtons();
        miniPlayer.classList.remove('active');
    });
    
    musicPlayer.addEventListener('timeupdate', updateProgress);
    musicPlayer.addEventListener('ended', () => {
        nextBtn.click();
    });
    
    musicPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButtons();
        miniPlayer.classList.add('active');
    });
    
    musicPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButtons();
    });
    
    progressBar.addEventListener('click', setProgress);
    
    // Fechar modal
    document.querySelector('#music-modal .close-modal').addEventListener('click', () => {
        musicModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === musicModal) {
            musicModal.style.display = 'none';
        }
    });
    
    // Carregar músicas quando a seção for aberta
    document.querySelector('nav').addEventListener('click', (e) => {
        if (e.target.dataset.section === 'openings') {
            loadMusic('openings');
        }
    });

    // Configurar tabs de música
    const musicTabs = document.querySelectorAll('.music-tab');
    musicTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            musicTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.dataset.section;
            if (section === 'openings') {
                loadMusic('openings');
            } else if (section === 'osts') {
                loadMusic('osts');
            }
        });
    });

    // Inicializar quando os dados dos animes estiverem carregados
    function initializeMusicPlayer() {
        // Processar os dados dos animes
        processMusicLibrary(animeDB.animes);
        
        // Carregar a seção inicial
        loadMusic('openings');
        
        // Ativar a primeira tab
        document.querySelector('.music-tab').click();
    }

    // Aguardar os dados serem carregados
    if (animeDB.animes.length > 0) {
        initializeMusicPlayer();
    } else {
        const checkDataLoaded = setInterval(() => {
            if (animeDB.animes.length > 0) {
                clearInterval(checkDataLoaded);
                initializeMusicPlayer();
            }
        }, 100);
    }
});
