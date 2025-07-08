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
    let musicLibrary = { themes: [], osts: {} };

    // Função principal para inicializar
    function initMusicPlayer() {
        // Verificar se animeDB está disponível e tem dados
        if (window.animeDB && animeDB.animes && animeDB.animes.length > 0) {
            processMusicLibrary(animeDB.animes);
            loadMusic('openings');
            setupEventListeners();
        } else {
            // Tentar novamente após um breve delay
            setTimeout(initMusicPlayer, 100);
        }
    }

    // Processar os dados dos animes para a biblioteca musical
    function processMusicLibrary(animes) {
        musicLibrary = { themes: [], osts: {} };
        
        animes.forEach(anime => {
            // Processar openings
            if (anime.openings && Array.isArray(anime.openings)) {
                anime.openings.forEach(op => {
                    musicLibrary.themes.push({
                        title: op.title || `Opening ${musicLibrary.themes.length + 1}`,
                        artist: op.artist || "Artista Desconhecido",
                        anime: anime.title,
                        cover: op.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                        audio: op.audio,
                        type: "opening"
                    });
                });
            }
            
            // Processar endings
            if (anime.endings && Array.isArray(anime.endings)) {
                anime.endings.forEach(ed => {
                    musicLibrary.themes.push({
                        title: ed.title || `Ending ${musicLibrary.themes.length + 1}`,
                        artist: ed.artist || "Artista Desconhecido",
                        anime: anime.title,
                        cover: ed.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                        audio: ed.audio,
                        type: "ending"
                    });
                });
            }
            
            // Processar OSTs
            if (anime.osts && typeof anime.osts === 'object') {
                for (const [albumName, albumData] of Object.entries(anime.osts)) {
                    if (!musicLibrary.osts[albumName]) {
                        musicLibrary.osts[albumName] = {
                            year: albumData.year || "",
                            cover: albumData.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                            tracks: []
                        };
                    }
                    
                    if (albumData.tracks && Array.isArray(albumData.tracks)) {
                        albumData.tracks.forEach(track => {
                            musicLibrary.osts[albumName].tracks.push({
                                title: track.title || "Faixa sem título",
                                artist: track.artist || "Artista Desconhecido",
                                anime: anime.title,
                                audio: track.audio
                            });
                        });
                    }
                }
            }
        });
        
        // Ordenar por anime e tipo
        musicLibrary.themes.sort((a, b) => {
            if (a.anime < b.anime) return -1;
            if (a.anime > b.anime) return 1;
            return a.type === 'opening' ? -1 : 1;
        });
    }

    // Carregar a seção de músicas
    function loadMusic(type) {
        currentType = type;
        
        // Esconder todas as grids
        document.querySelectorAll('.music-grid-container').forEach(el => {
            el.style.display = 'none';
        });
        
        // Mostrar a grid correta
        const gridId = type === 'osts' ? 'osts-container' : 'music-grid-container';
        const gridContainer = document.getElementById(gridId);
        if (gridContainer) gridContainer.style.display = 'block';
        
        if (type === 'osts') {
            currentPlaylist = [];
            renderAlbums();
        } else {
            currentPlaylist = musicLibrary.themes;
            renderMusicGrid();
        }
    }

    // Renderizar álbuns de OST
    function renderAlbums() {
        const grid = document.getElementById('osts-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (const [albumName, albumData] of Object.entries(musicLibrary.osts)) {
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
                <div class="music-grid" id="album-${albumName.replace(/\W+/g, '-')}"></div>
            `;
            
            grid.appendChild(albumSection);
            
            const albumGrid = albumSection.querySelector('.music-grid');
            albumData.tracks.forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card';
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

    // Renderizar grid de openings/endings
    function renderMusicGrid() {
        const grid = document.getElementById('music-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        let currentAnime = '';
        
        musicLibrary.themes.forEach((track, index) => {
            // Adicionar cabeçalho do anime se mudou
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
            
            // Criar card da música
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

    // Tocar a música selecionada
    function playTrack() {
        const track = currentPlaylist[currentTrack];
        if (!track || !track.audio) {
            console.error('Música ou URL de áudio não encontrada');
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

    // Controles de reprodução
    function togglePlay() {
        if (musicPlayer.paused) {
            musicPlayer.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayButtons();
                })
                .catch(e => console.error("Erro ao reproduzir:", e));
        } else {
            musicPlayer.pause();
            isPlaying = false;
            updatePlayButtons();
        }
    }
    
    function prevTrack() {
        currentTrack--;
        if (currentTrack < 0) currentTrack = currentPlaylist.length - 1;
        playTrack();
    }
    
    function nextTrack() {
        currentTrack++;
        if (currentTrack >= currentPlaylist.length) currentTrack = 0;
        playTrack();
    }
    
    function closeMiniPlayer() {
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButtons();
        miniPlayer.classList.remove('active');
    }

    // Atualizar UI
    function updatePlayButtons() {
        const icon = isPlaying ? 'pause' : 'play';
        playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        miniPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }
    
    function updateProgress() {
        const { currentTime, duration } = musicPlayer;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = progressPercent;
        
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };
        
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration || 0);
    }
    
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = musicPlayer.duration;
        musicPlayer.currentTime = (clickX / width) * duration;
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Controles do player
        playBtn.addEventListener('click', togglePlay);
        miniPlayBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', prevTrack);
        nextBtn.addEventListener('click', nextTrack);
        miniCloseBtn.addEventListener('click', closeMiniPlayer);
        
        // Barra de progresso
        musicPlayer.addEventListener('timeupdate', updateProgress);
        musicPlayer.addEventListener('ended', nextTrack);
        progressBar.addEventListener('click', setProgress);
        
        // Tabs de navegação
        document.querySelectorAll('.music-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });
        
        // Fechar modal
        document.querySelector('#music-modal .close-modal').addEventListener('click', () => {
            musicModal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === musicModal) {
                musicModal.style.display = 'none';
            }
        });
    }

    // Iniciar o player
    initMusicPlayer();
});
