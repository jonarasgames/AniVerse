// music-player.js - Versão Final Corrigida
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando player de música...");

    // Elementos do DOM
    const elements = {
        musicModal: document.getElementById('music-modal'),
        miniPlayer: document.getElementById('mini-player'),
        playBtn: document.getElementById('music-play'),
        miniPlayBtn: document.getElementById('mini-play'),
        prevBtn: document.getElementById('music-prev'),
        nextBtn: document.getElementById('music-next'),
        miniCloseBtn: document.getElementById('mini-close'),
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
        musicGridContainer: document.getElementById('music-grid-container'),
        ostsContainer: document.getElementById('osts-container'),
        musicGrid: document.getElementById('music-grid'),
        ostsGrid: document.getElementById('osts-grid')
    };

    // Verificar se todos os elementos foram encontrados
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Elemento não encontrado: ${key}`);
        }
    }

    const musicPlayer = new Audio();
    let currentTrack = 0;
    let currentPlaylist = [];
    let currentType = '';
    let isPlaying = false;
    let musicLibrary = { themes: [], osts: {} };

    // Função para esperar pelo animeDB
    function waitForAnimeDB(callback) {
        if (window.animeDB && animeDB.animes && animeDB.animes.length > 0) {
            callback();
        } else {
            console.log("Aguardando animeDB...");
            setTimeout(() => waitForAnimeDB(callback), 100);
        }
    }

    // Processar dados musicais
    function processMusicLibrary() {
        console.log("Processando biblioteca musical...");
        musicLibrary = { themes: [], osts: {} };

        animeDB.animes.forEach(anime => {
            // Processar openings
            if (anime.openings && Array.isArray(anime.openings)) {
                anime.openings.forEach((op, index) => {
                    if (op.audio) {
                        musicLibrary.themes.push({
                            title: op.title || `Opening ${index + 1}`,
                            artist: op.artist || "Artista Desconhecido",
                            anime: anime.title,
                            cover: op.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                            audio: op.audio,
                            type: "opening"
                        });
                    }
                });
            }

            // Processar endings
            if (anime.endings && Array.isArray(anime.endings)) {
                anime.endings.forEach((ed, index) => {
                    if (ed.audio) {
                        musicLibrary.themes.push({
                            title: ed.title || `Ending ${index + 1}`,
                            artist: ed.artist || "Artista Desconhecido",
                            anime: anime.title,
                            cover: ed.cover || anime.thumbnail || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg',
                            audio: ed.audio,
                            type: "ending"
                        });
                    }
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
                            if (track.audio) {
                                musicLibrary.osts[albumName].tracks.push({
                                    title: track.title || "Faixa sem título",
                                    artist: track.artist || "Artista Desconhecido",
                                    anime: anime.title,
                                    audio: track.audio
                                });
                            }
                        });
                    }
                }
            }
        });

        console.log("Biblioteca musical processada:", musicLibrary);
    }

    // Carregar seção de músicas
    function loadMusic(type) {
        console.log(`Carregando: ${type}`);
        currentType = type;

        // Esconder todas as grids
        elements.musicGridContainer.style.display = 'none';
        elements.ostsContainer.style.display = 'none';

        if (type === 'osts') {
            elements.ostsContainer.style.display = 'block';
            currentPlaylist = [];
            renderAlbums();
        } else {
            elements.musicGridContainer.style.display = 'block';
            currentPlaylist = musicLibrary.themes;
            renderMusicGrid();
        }
    }

    // Renderizar álbuns de OST
    function renderAlbums() {
        console.log("Renderizando álbuns...");
        elements.ostsGrid.innerHTML = '';

        if (Object.keys(musicLibrary.osts).length === 0) {
            elements.ostsGrid.innerHTML = '<p class="no-results">Nenhuma OST encontrada.</p>';
            return;
        }

        for (const [albumName, albumData] of Object.entries(musicLibrary.osts)) {
            if (!albumData.tracks || albumData.tracks.length === 0) continue;

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
                <div class="music-grid"></div>
            `;

            elements.ostsGrid.appendChild(albumSection);

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
                    elements.musicModal.style.display = 'block';
                });

                albumGrid.appendChild(card);
            });
        }
    }

    // Renderizar grid de openings/endings
    function renderMusicGrid() {
        console.log("Renderizando grid de músicas...");
        elements.musicGrid.innerHTML = '';

        if (musicLibrary.themes.length === 0) {
            elements.musicGrid.innerHTML = '<p class="no-results">Nenhuma música encontrada.</p>';
            return;
        }

        let currentAnime = '';
        
        musicLibrary.themes.forEach((track, index) => {
            if (track.anime !== currentAnime) {
                currentAnime = track.anime;
                const header = document.createElement('div');
                header.className = 'anime-header';
                header.innerHTML = `
                    <h2>${currentAnime}</h2>
                    <span class="anime-theme-badge ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                `;
                elements.musicGrid.appendChild(header);
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
                elements.musicModal.style.display = 'block';
            });
            
            elements.musicGrid.appendChild(card);
        });
    }

    // Tocar música
    function playTrack() {
        const track = currentPlaylist[currentTrack];
        if (!track || !track.audio) {
            console.error('Música inválida:', track);
            return;
        }

        console.log('Tocando:', track.title);
        
        musicPlayer.src = track.audio;
        elements.coverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        elements.miniCoverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        elements.musicTitle.textContent = track.title;
        elements.miniTitle.textContent = track.title;
        elements.musicArtist.textContent = track.artist;
        elements.miniArtist.textContent = track.artist;
        elements.musicAnime.textContent = track.anime || '';
        
        musicPlayer.play()
            .then(() => {
                isPlaying = true;
                updatePlayButtons();
                elements.miniPlayer.classList.add('active');
            })
            .catch(e => {
                console.error("Erro ao reproduzir:", e);
                alert(`Erro ao reproduzir: ${e.message}`);
            });
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
        currentTrack = (currentTrack - 1 + currentPlaylist.length) % currentPlaylist.length;
        playTrack();
    }
    
    function nextTrack() {
        currentTrack = (currentTrack + 1) % currentPlaylist.length;
        playTrack();
    }
    
    function closeMiniPlayer() {
        musicPlayer.pause();
        isPlaying = false;
        updatePlayButtons();
        elements.miniPlayer.classList.remove('active');
    }

    // Atualizar UI
    function updatePlayButtons() {
        const icon = isPlaying ? 'pause' : 'play';
        elements.playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        elements.miniPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }
    
    function updateProgress() {
        const { currentTime, duration } = musicPlayer;
        const progressPercent = (currentTime / duration) * 100 || 0;
        elements.progressBar.value = progressPercent;
        
        const formatTime = (seconds) => {
            if (isNaN(seconds)) return "0:00";
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };
        
        elements.currentTimeEl.textContent = formatTime(currentTime);
        elements.durationEl.textContent = formatTime(duration);
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
        elements.playBtn.addEventListener('click', togglePlay);
        elements.miniPlayBtn.addEventListener('click', togglePlay);
        elements.prevBtn.addEventListener('click', prevTrack);
        elements.nextBtn.addEventListener('click', nextTrack);
        elements.miniCloseBtn.addEventListener('click', closeMiniPlayer);
        
        // Barra de progresso
        musicPlayer.addEventListener('timeupdate', updateProgress);
        musicPlayer.addEventListener('ended', nextTrack);
        elements.progressBar.addEventListener('click', setProgress);
        
        // Tabs de navegação
        elements.musicTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                elements.musicTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });
        
        // Fechar modal
        document.querySelector('#music-modal .close-modal').addEventListener('click', () => {
            elements.musicModal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === elements.musicModal) {
                elements.musicModal.style.display = 'none';
            }
        });
    }

    // Inicialização
    function initialize() {
        waitForAnimeDB(() => {
            processMusicLibrary();
            setupEventListeners();
            
            // Ativar a primeira tab
            const firstTab = document.querySelector('.music-tab');
            if (firstTab) {
                firstTab.click();
            } else {
                loadMusic('openings');
            }
        });
    }

    // Iniciar
    initialize();
});
