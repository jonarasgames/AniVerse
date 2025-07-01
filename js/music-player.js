document.addEventListener('DOMContentLoaded', function() {
    const musicModal = document.getElementById('music-modal');
    const musicPlayer = document.getElementById('music-player');
    const miniPlayer = document.getElementById('mini-player');
    const playBtn = document.getElementById('music-play');
    const miniPlayBtn = document.getElementById('mini-play');
    const prevBtn = document.getElementById('music-prev');
    const nextBtn = document.getElementById('music-next');
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
    let playlist = [];
    
    // Dados de exemplo (substitua com seus dados reais)
    const musicLibrary = {
        openings: [
            {
                title: "Gurenge",
                artist: "LiSA",
                anime: "Demon Slayer",
                cover: "https://i.ibb.co/0jq7R0y/anime-bg.jpg",
                audio: "https://ia801700.us.archive.org/9/items/dragonmaid-02/01%20%E5%B0%8F%E6%9E%97%E3%81%95%E3%82%93%E3%81%A1.mp3",
                type: "opening"
            },
            // Adicione mais músicas aqui
        ],
        osts: [
            {
                title: "Main Theme",
                artist: "Yuki Kajiura",
                anime: "Demon Slayer",
                cover: "https://i.ibb.co/0jq7R0y/anime-bg.jpg",
                audio: "https://ia801700.us.archive.org/9/items/dragonmaid-02/01%20%E5%B0%8F%E6%9E%97%E3%81%95%E3%82%93%E3%81%A1.mp3",
                type: "ost"
            },
            // Adicione mais OSTs aqui
        ]
    };
    
    // Carregar a lista de músicas
    function loadMusic(type) {
        playlist = musicLibrary[type];
        renderMusicGrid(type);
    }
    
    // Renderizar a grade de músicas
    function renderMusicGrid(type) {
        const grid = document.getElementById(`${type}-grid`);
        if (!grid) return;
        
        grid.innerHTML = '';
        
        musicLibrary[type].forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="music-cover">
                    <img src="${track.cover}" alt="${track.title}">
                </div>
                <div class="music-info">
                    <h3 class="music-title">${track.title}</h3>
                    <p class="music-anime">${track.anime}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                currentTrack = index;
                playTrack(type);
                musicModal.style.display = 'block';
            });
            
            grid.appendChild(card);
        });
    }
    
    // Tocar música
    function playTrack(type) {
        const track = musicLibrary[type][currentTrack];
        
        musicPlayer.src = track.audio;
        coverImg.src = track.cover;
        miniCoverImg.src = track.cover;
        musicTitle.textContent = track.title;
        miniTitle.textContent = track.title;
        musicArtist.textContent = track.artist;
        miniArtist.textContent = track.artist;
        musicAnime.textContent = track.anime;
        
        musicPlayer.play()
            .then(() => {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
                miniPlayer.style.display = 'flex';
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
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
    playBtn.addEventListener('click', () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            musicPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    miniPlayBtn.addEventListener('click', () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            musicPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    prevBtn.addEventListener('click', () => {
        currentTrack--;
        if (currentTrack < 0) currentTrack = playlist.length - 1;
        playTrack();
    });
    
    nextBtn.addEventListener('click', () => {
        currentTrack++;
        if (currentTrack > playlist.length - 1) currentTrack = 0;
        playTrack();
    });
    
    musicPlayer.addEventListener('timeupdate', updateProgress);
    musicPlayer.addEventListener('ended', () => {
        nextBtn.click();
    });
    
    progressBar.addEventListener('click', setProgress);
    
    // Fechar modal
    document.querySelector('.close-modal').addEventListener('click', () => {
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
        } else if (e.target.dataset.section === 'osts') {
            loadMusic('osts');
        }
    });
    
    // Inicializar
    loadMusic('openings');
});
