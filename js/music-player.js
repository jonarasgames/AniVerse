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
    let animeData = [];

    // Carregar dados do anime-data.json
    fetch('anime-data.json')
        .then(response => response.json())
        .then(data => {
            animeData = data;
            loadMusic('openings');
        })
        .catch(error => console.error('Erro ao carregar anime-data.json:', error));

    // Carregar a lista de músicas
    function loadMusic(type) {
        currentType = type;
        
        if (type === 'osts') {
            renderAlbums();
        } else {
            // Criar playlist combinando todas as músicas do tipo especificado de todos os animes
            currentPlaylist = [];
            animeData.forEach(anime => {
                if (anime[type] && anime[type].length > 0) {
                    anime[type].forEach(track => {
                        currentPlaylist.push({
                            ...track,
                            anime: anime.title,
                            cover: track.cover || anime.thumbnail
                        });
                    });
                }
            });
            renderMusicGrid(type);
        }
    }
    
    // Renderizar álbuns (para OSTs)
    function renderAlbums() {
        const grid = document.getElementById('osts-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Coletar todos os álbuns OST de todos os animes
        const allAlbums = {};
        animeData.forEach(anime => {
            if (anime.osts) {
                for (const [albumName, albumData] of Object.entries(anime.osts)) {
                    allAlbums[albumName] = {
                        ...albumData,
                        anime: anime.title,
                        cover: albumData.cover || anime.thumbnail
                    };
                }
            }
        });
        
        for (const [albumName, albumData] of Object.entries(allAlbums)) {
            const albumSection = document.createElement('div');
            albumSection.className = 'album-section';
            
            albumSection.innerHTML = `
                <div class="album-header">
                    <div class="album-cover">
                        <img src="${albumData.cover}" alt="${albumName}">
                    </div>
                    <div>
                        <h3 class="album-title">${albumName}</h3>
                        <p class="album-year">${albumData.year} • ${albumData.anime}</p>
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
                        <img src="${albumData.cover}" alt="${track.title}">
                    </div>
                    <div class="music-info">
                        <h3 class="music-title">${track.title}</h3>
                        <p class="music-anime">${track.artist}</p>
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
    
    // Renderizar a grade de músicas (para openings e endings)
    function renderMusicGrid(type) {
        const grid = document.getElementById(`${type}-grid`);
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Filtrar apenas os animes que têm o tipo de música especificado
        const animesWithMusic = animeData.filter(anime => anime[type] && anime[type].length > 0);
        
        animesWithMusic.forEach(anime => {
            anime[type].forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.index = index;
                
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${track.cover || anime.thumbnail}" alt="${track.title}">
                    </div>
                    <div class="music-info">
                        <h3 class="music-title">${track.title}</h3>
                        <p class="music-anime">${anime.title}</p>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    // Encontrar a posição correta na playlist combinada
                    currentTrack = currentPlaylist.findIndex(t => 
                        t.title === track.title && 
                        t.artist === track.artist && 
                        t.anime === anime.title
                    );
                    playTrack();
                    musicModal.style.display = 'block';
                });
                
                grid.appendChild(card);
            });
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
        } else if (e.target.dataset.section === 'endings') {
            loadMusic('endings');
        } else if (e.target.dataset.section === 'osts') {
            loadMusic('osts');
        }
    });
    
    // Inicializar
    // loadMusic('openings'); - Agora é chamado após carregar o JSON
});
