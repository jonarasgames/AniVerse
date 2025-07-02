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
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const volumeControl = document.getElementById('volume-control');
    const repeatBtn = document.getElementById('repeat-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    
    let currentTrack = 0;
    let currentPlaylist = [];
    let currentType = '';
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    let animeData = [];

    // Carregar dados do JSON
    async function loadAnimeData() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/jonarasgames/AniVerse/main/anime-data.json');
            animeData = await response.json();
            console.log('Dados carregados:', animeData);
            loadMusic('openings');
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    // Processar os dados para criar a biblioteca de músicas
    function processMusicLibrary() {
        const library = {
            openings: [],
            endings: [],
            osts: {}
        };

        animeData.forEach(anime => {
            // Processar openings
            if (anime.openings && anime.openings.length > 0) {
                anime.openings.forEach(opening => {
                    library.openings.push({
                        title: opening.title,
                        artist: opening.artist,
                        anime: anime.title,
                        cover: opening.cover || anime.thumbnail,
                        audio: opening.audio,
                        type: "opening",
                        duration: opening.duration || 0
                    });
                });
            }

            // Processar endings
            if (anime.endings && anime.endings.length > 0) {
                anime.endings.forEach(ending => {
                    library.endings.push({
                        title: ending.title,
                        artist: ending.artist,
                        anime: anime.title,
                        cover: ending.cover || anime.thumbnail,
                        audio: ending.audio,
                        type: "ending",
                        duration: ending.duration || 0
                    });
                });
            }

            // Processar OSTs
            if (anime.osts && Object.keys(anime.osts).length > 0) {
                for (const [albumName, albumData] of Object.entries(anime.osts)) {
                    if (!library.osts[albumName]) {
                        library.osts[albumName] = {
                            year: albumData.year,
                            cover: albumData.cover || anime.thumbnail,
                            tracks: []
                        };
                    }

                    albumData.tracks.forEach(track => {
                        library.osts[albumName].tracks.push({
                            title: track.title,
                            artist: track.artist,
                            anime: anime.title,
                            cover: albumData.cover || anime.thumbnail,
                            audio: track.audio,
                            duration: track.duration || 0,
                            album: albumName
                        });
                    });
                }
            }
        });

        return library;
    }

    // Carregar a lista de músicas
    function loadMusic(type) {
        currentType = type;
        const musicLibrary = processMusicLibrary();
        
        if (type === 'osts') {
            renderAlbums(musicLibrary.osts);
        } else {
            currentPlaylist = musicLibrary[type];
            renderMusicGrid(type, musicLibrary[type]);
        }
    }
    
    // Renderizar álbuns (para OSTs)
    function renderAlbums(ostsData) {
        const grid = document.getElementById('osts-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (const [albumName, albumData] of Object.entries(ostsData)) {
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
                        <img src="${track.cover}" alt="${track.title}" loading="lazy">
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
    
    // Renderizar a grade de músicas (para openings/endings)
    function renderMusicGrid(type, tracks) {
        const grid = document.getElementById(`${type}-grid`);
        if (!grid) return;
        
        grid.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="music-cover">
                    <img src="${track.cover}" alt="${track.title}" loading="lazy">
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
        
        musicPlayer.src = track.audio;
        coverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        miniCoverImg.src = track.cover || 'https://i.ibb.co/0jq7R0y/anime-bg.jpg';
        musicTitle.textContent = track.title;
        miniTitle.textContent = track.title;
        musicArtist.textContent = track.artist;
        miniArtist.textContent = track.artist;
        musicAnime.textContent = track.anime || '';
        
        // Atualizar duração se disponível
        if (track.duration) {
            const minutes = Math.floor(track.duration / 60);
            const seconds = Math.floor(track.duration % 60);
            durationEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
        
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
    
    // Alternar shuffle
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        if (isShuffle) {
            shufflePlaylist();
        }
    }
    
    // Embaralhar playlist
    function shufflePlaylist() {
        for (let i = currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
        }
        currentTrack = 0;
    }
    
    // Alternar repeat
    function toggleRepeat() {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
    }
    
    // Alternar tela cheia
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            musicModal.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
            });
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
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
        if (isShuffle) {
            currentTrack = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            currentTrack++;
            if (currentTrack > currentPlaylist.length - 1) currentTrack = 0;
        }
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
        if (isRepeat) {
            musicPlayer.currentTime = 0;
            musicPlayer.play();
        } else {
            nextBtn.click();
        }
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
    
    volumeControl.addEventListener('input', () => {
        musicPlayer.volume = volumeControl.value;
    });
    
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
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
        } else if (e.target.dataset.section === 'endings') {
            loadMusic('endings');
        } else if (e.target.dataset.section === 'osts') {
            loadMusic('osts');
        }
    });
    
    // Inicializar
    loadAnimeData();
});
