// music-player.js - VERSÃO MELHORADA E COMPLETA
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando player de música melhorado...");

    // Elementos do DOM
    const elements = {
        musicModal: document.getElementById('music-modal'),
        miniPlayer: document.getElementById('mini-player'),
        playBtn: document.getElementById('music-play'),
        miniPlayBtn: document.querySelector('#mini-player .mini-control-btn'),
        prevBtn: document.getElementById('music-prev'),
        nextBtn: document.getElementById('music-next'),
        progressBar: document.querySelector('.progress-bar'),
        progress: document.querySelector('.progress'),
        currentTimeEl: document.querySelector('.time-display span:first-child'),
        durationEl: document.querySelector('.time-display span:last-child'),
        coverImg: document.querySelector('.music-cover-container img'),
        miniCoverImg: document.querySelector('.mini-cover img'),
        musicTitle: document.querySelector('.music-title'),
        miniTitle: document.querySelector('.mini-title'),
        musicArtist: document.querySelector('.music-artist'),
        miniArtist: document.querySelector('.mini-artist'),
        musicAnime: document.querySelector('.music-anime'),
        volumeControl: document.getElementById('volume-control'),
        closeModal: document.querySelector('.music-modal-content .close-modal'),
        miniCloseBtn: document.querySelector('#mini-player .mini-control-btn:last-child'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        repeatBtn: document.getElementById('repeat-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        musicTabs: document.querySelectorAll('.music-tab'),
        musicGrid: document.getElementById('music-grid'),
        ostsGrid: document.getElementById('osts-grid')
    };

    const musicPlayer = new Audio();
    let currentTrack = 0;
    let currentPlaylist = [];
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    let updateInterval;
    let playlistHistory = [];
    let originalPlaylistOrder = [];

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
            renderAlbums(library.osts);
        } else {
            currentPlaylist = library.themes;
            originalPlaylistOrder = [...library.themes];
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
                            <div class="music-card" data-index="${index}" data-album="${album}">
                                <div class="music-cover">
                                    <img src="${data.cover}" loading="lazy">
                                    <span class="music-type ost">OST</span>
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
                const album = this.dataset.album;
                currentPlaylist = osts[album].tracks;
                originalPlaylistOrder = [...currentPlaylist];
                currentTrack = parseInt(this.dataset.index);
                playTrack();
                openMusicModal();
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
                    </div>
                `;
            }

            elements.musicGrid.innerHTML += `
                <div class="music-card" data-index="${index}">
                    <div class="music-cover">
                        <img src="${track.cover}" loading="lazy">
                        <span class="music-type ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
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
                openMusicModal();
            });
        });
    }

    // Toca a música selecionada
    function playTrack() {
        const track = currentPlaylist[currentTrack];
        if (!track) return;

        // Adiciona ao histórico
        playlistHistory.push(currentTrack);
        if (playlistHistory.length > 10) playlistHistory.shift();

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
                updateMiniPlayer();
                startProgressUpdate();
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }

    // Atualiza os botões de play/pause
    function updatePlayButtons() {
        const playIcon = isPlaying ? 'pause' : 'play';
        elements.playBtn.innerHTML = `<i class="fas fa-${playIcon}"></i>`;
        elements.miniPlayBtn.innerHTML = `<i class="fas fa-${playIcon}"></i>`;
    }

    // Atualiza o mini player
    function updateMiniPlayer() {
        elements.miniPlayer.classList.add('active');
    }

    // Inicia a atualização do progresso
    function startProgressUpdate() {
        clearInterval(updateInterval);
        updateInterval = setInterval(updateProgress, 1000);
        updateProgress();
    }

    // Atualiza a barra de progresso
    function updateProgress() {
        if (musicPlayer.duration) {
            const progressPercent = (musicPlayer.currentTime / musicPlayer.duration) * 100;
            elements.progress.style.width = `${progressPercent}%`;
            
            // Formatando o tempo
            elements.currentTimeEl.textContent = formatTime(musicPlayer.currentTime);
            elements.durationEl.textContent = formatTime(musicPlayer.duration);
        }
    }

    // Formata o tempo (mm:ss)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Alterna entre play/pause
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

    // Próxima música
    function nextTrack() {
        if (isShuffle) {
            currentTrack = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            currentTrack = (currentTrack + 1) % currentPlaylist.length;
        }
        playTrack();
    }

    // Música anterior
    function prevTrack() {
        if (playlistHistory.length > 1) {
            playlistHistory.pop(); // Remove o atual
            currentTrack = playlistHistory.pop(); // Pega o anterior
        } else {
            currentTrack = (currentTrack - 1 + currentPlaylist.length) % currentPlaylist.length;
        }
        playTrack();
    }

    // Alterna o modo shuffle
    function toggleShuffle() {
        isShuffle = !isShuffle;
        elements.shuffleBtn.classList.toggle('active', isShuffle);
        
        if (isShuffle) {
            // Embaralha a playlist
            currentPlaylist = [...originalPlaylistOrder].sort(() => Math.random() - 0.5);
        } else {
            // Volta para a ordem original
            currentPlaylist = [...originalPlaylistOrder];
        }
    }

    // Alterna o modo repeat
    function toggleRepeat() {
        isRepeat = !isRepeat;
        elements.repeatBtn.classList.toggle('active', isRepeat);
        musicPlayer.loop = isRepeat;
    }

    // Abre o modal de música
    function openMusicModal() {
        elements.musicModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Fecha o modal de música
    function closeMusicModal() {
        elements.musicModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Configura os eventos
    function setupEventListeners() {
        // Controles principais
        elements.playBtn.addEventListener('click', togglePlay);
        elements.miniPlayBtn.addEventListener('click', togglePlay);
        elements.nextBtn.addEventListener('click', nextTrack);
        elements.prevBtn.addEventListener('click', prevTrack);
        
        // Barra de progresso
        elements.progressBar.addEventListener('click', (e) => {
            const clickPosition = e.offsetX;
            const progressBarWidth = elements.progressBar.clientWidth;
            const seekTime = (clickPosition / progressBarWidth) * musicPlayer.duration;
            musicPlayer.currentTime = seekTime;
        });
        
        // Volume
        elements.volumeControl.addEventListener('input', () => {
            musicPlayer.volume = elements.volumeControl.value;
        });
        
        // Shuffle e Repeat
        elements.shuffleBtn.addEventListener('click', toggleShuffle);
        elements.repeatBtn.addEventListener('click', toggleRepeat);
        
        // Fechar modal
        elements.closeModal.addEventListener('click', closeMusicModal);
        elements.miniCloseBtn.addEventListener('click', () => {
            elements.miniPlayer.classList.remove('active');
            musicPlayer.pause();
            isPlaying = false;
            updatePlayButtons();
        });
        
        // Tela cheia
        elements.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.querySelector('.music-modal-content').requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        // Eventos do player
        musicPlayer.addEventListener('ended', () => {
            if (!isRepeat) {
                nextTrack();
            }
        });
        
        musicPlayer.addEventListener('timeupdate', updateProgress);
        
        // Tabs de navegação
        elements.musicTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                elements.musicTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadMusic(this.dataset.section);
            });
        });
    }

    // Inicialização
    waitForAnimeDB(() => {
        setupEventListeners();
        
        // Carrega a primeira tab
        document.querySelector('.music-tab').click();
        
        // Configura o volume inicial
        musicPlayer.volume = elements.volumeControl.value;
    });
});
