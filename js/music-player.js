// music-player.js - VERSÃO CORRIGIDA E FUNCIONAL
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
        musicContainer: document.getElementById('music-grid-container'),
        ostsContainer: document.getElementById('osts-container')
    };

    const musicPlayer = new Audio();
    let currentTrack = 0;
    let currentPlaylist = [];
    let isPlaying = false;

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
        
        if (type === 'osts') {
            currentPlaylist = [];
            elements.musicContainer.classList.remove('active');
            elements.ostsContainer.classList.add('active');
            renderAlbums(library.osts);
        } else {
            currentPlaylist = library.themes;
            elements.ostsContainer.classList.remove('active');
            elements.musicContainer.classList.add('active');
            renderMusicGrid(library.themes);
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
                                <div class="music-cover">
                                    <img src="${data.cover}" loading="lazy">
                                </div>
                                <div class="music-info">
                                    <h3>${track.title}</h3>
                                    <p>${track.artist}</p>
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
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                elements.musicModal.style.display = 'block';
            });
        });
    }

    // Renderiza a grid de músicas
    function renderMusicGrid(tracks) {
        elements.musicGrid.innerHTML = '';
        let currentAnime = '';

        tracks.forEach((track, index) => {
            if (track.anime !== currentAnime) {
                currentAnime = track.anime;
                elements.musicGrid.innerHTML += `
                    <div class="anime-header">
                        <h2>${currentAnime}</h2>
                        <span class="theme-badge ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                    </div>
                `;
            }

            elements.musicGrid.innerHTML += `
                <div class="music-card" data-index="${index}">
                    <div class="music-cover">
                        <img src="${track.cover}" loading="lazy">
                        <span class="theme-badge ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                    </div>
                    <div class="music-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                </div>
            `;
        });

        // Adiciona eventos aos cards
        elements.musicGrid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', function() {
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                elements.musicModal.style.display = 'block';
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
                
                // Atualiza o tempo da música
                updateTimeInfo();
                setInterval(updateTimeInfo, 1000);
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }

    // Atualiza o tempo da música
    function updateTimeInfo() {
        if (!isNaN(musicPlayer.duration)) {
            elements.currentTimeEl.textContent = formatTime(musicPlayer.currentTime);
            elements.durationEl.textContent = formatTime(musicPlayer.duration);
            elements.progressBar.value = (musicPlayer.currentTime / musicPlayer.duration) * 100;
        }
    }

    // Formata o tempo (mm:ss)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        currentTrack = (currentTrack + 1) % currentPlaylist.length;
        playTrack();
    }

    function prevTrack() {
        currentTrack = (currentTrack - 1 + currentPlaylist.length) % currentPlaylist.length;
        playTrack();
    }

    // Barra de progresso
    elements.progressBar.addEventListener('click', function(e) {
        const percent = e.offsetX / this.offsetWidth;
        musicPlayer.currentTime = percent * musicPlayer.duration;
        elements.progressBar.value = percent * 100;
    });

    // Evento quando a música termina
    musicPlayer.addEventListener('ended', function() {
        nextTrack();
    });

    // Inicialização
    waitForAnimeDB(() => {
        // Configura as tabs
        elements.musicTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                elements.musicTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });

        // Configura os botões de controle
        elements.playBtn.addEventListener('click', togglePlay);
        elements.miniPlayBtn.addEventListener('click', togglePlay);
        elements.nextBtn.addEventListener('click', nextTrack);
        elements.prevBtn.addEventListener('click', prevTrack);

        // Carrega a primeira tab
        document.querySelector('.music-tab').click();
    });
});
