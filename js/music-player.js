document.addEventListener('DOMContentLoaded', function() {
    // Elementos do player
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
    const volumeControl = document.getElementById('volume-control');
    const miniFullscreenBtn = document.getElementById('mini-fullscreen');

    let currentTrack = 0;
    let currentPlaylist = [];
    let currentType = '';
    let isPlaying = false;
    let animeData = [];
    let musicLibrary = { openings: [], endings: [], osts: {} };

    // Carregar JSON de animes
    async function loadAnimeData() {
        try {
            const response = await fetch('anime-data.json');
            if (!response.ok) throw new Error('Falha ao carregar o arquivo JSON');
            animeData = await response.json();
            processMusicLibrary();
            loadMusic('openings');
        } catch (error) {
            alert('Erro ao carregar as músicas. Por favor, tente recarregar a página.');
        }
    }

    // Processar dados para biblioteca de músicas
    function processMusicLibrary() {
        musicLibrary = { openings: [], endings: [], osts: {} };
        animeData.forEach(anime => {
            // Openings
            if (anime.openings && anime.openings.length > 0) {
                anime.openings.forEach(opening => {
                    musicLibrary.openings.push({
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
            // Endings
            if (anime.endings && anime.endings.length > 0) {
                anime.endings.forEach(ending => {
                    musicLibrary.endings.push({
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
            // OSTs
            if (anime.osts && Object.keys(anime.osts).length > 0) {
                for (const [albumName, albumData] of Object.entries(anime.osts)) {
                    if (!musicLibrary.osts[albumName]) {
                        musicLibrary.osts[albumName] = {
                            year: albumData.year,
                            cover: albumData.cover || anime.thumbnail,
                            tracks: []
                        };
                    }
                    albumData.tracks.forEach(track => {
                        musicLibrary.osts[albumName].tracks.push({
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
    }

    // Carregar lista de músicas (OP/ED juntos)
    function loadMusic(type) {
        currentType = type;
        document.querySelectorAll('.music-grid-container').forEach(el => {
            el.style.display = 'none';
        });
        const gridContainer = document.getElementById('music-grid-container');
        const ostsContainer = document.getElementById('osts-container');
        if (type === 'osts') {
            ostsContainer.style.display = 'block';
            renderAlbums(musicLibrary.osts);
        } else {
            gridContainer.style.display = 'block';
            currentPlaylist = [...musicLibrary.openings, ...musicLibrary.endings];
            renderMusicGrid(currentPlaylist);
        }
    }

    // Renderizar grade de músicas (OP/ED juntos)
    function renderMusicGrid(tracks) {
        const grid = document.getElementById('music-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const animeGroups = {};
        tracks.forEach(track => {
            if (!animeGroups[track.anime]) animeGroups[track.anime] = [];
            animeGroups[track.anime].push(track);
        });
        for (const anime in animeGroups) {
            const animeHeader = document.createElement('h2');
            animeHeader.className = 'anime-header';
            animeHeader.textContent = anime;
            grid.appendChild(animeHeader);
            animeGroups[anime].forEach(track => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${track.cover}" alt="${track.title}" loading="lazy">
                        <span class="music-type ${track.type}">${track.type === 'opening' ? 'OP' : 'ED'}</span>
                    </div>
                    <div class="music-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    const index = tracks.findIndex(t => t === track);
                    if (currentTrack === index && musicModal.style.display === 'flex') {
                        musicModal.style.display = 'flex';
                        return;
                    }
                    currentTrack = index;
                    playTrack();
                    musicModal.style.display = 'flex';
                });
                grid.appendChild(card);
            });
        }
    }

    // Renderizar álbuns (OSTs)
    function renderAlbums(osts) {
        const grid = document.getElementById('osts-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (const [albumName, albumData] of Object.entries(osts)) {
            const albumSection = document.createElement('div');
            albumSection.className = 'album-section';
            albumSection.innerHTML = `
                <div class="album-header">
                    <div class="album-cover">
                        <img src="${albumData.cover}" alt="${albumName}">
                    </div>
                    <div>
                        <h3 class="album-title">${albumName}</h3>
                        <p class="album-year">${albumData.year || ''}</p>
                    </div>
                </div>
                <div class="music-grid"></div>
            `;
            grid.appendChild(albumSection);
            const albumGrid = albumSection.querySelector('.music-grid');
            albumData.tracks.forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${albumData.cover}" alt="${track.title}">
                    </div>
                    <div class="music-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    currentPlaylist = albumData.tracks;
                    currentTrack = index;
                    playTrack();
                    musicModal.style.display = 'flex';
                });
                albumGrid.appendChild(card);
            });
        }
    }

    // Player
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
        musicPlayer.play().then(() => {
            isPlaying = true;
            updatePlayButtons();
            miniPlayer.classList.add('active');
        }).catch(e => console.error("Erro ao reproduzir:", e));
    }

    function updatePlayButtons() {
        if (isPlaying) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    function updateProgress() {
        const { currentTime, duration } = musicPlayer;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = progressPercent || 0;
        // Tempo atual
        const currentMinutes = Math.floor(currentTime / 60);
        const currentSeconds = Math.floor(currentTime % 60);
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
        // Duração
        const durationMinutes = Math.floor(duration / 60);
        const durationSeconds = Math.floor(duration % 60);
        durationEl.textContent = `${durationMinutes}:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`;
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = musicPlayer.duration;
        musicPlayer.currentTime = (clickX / width) * duration;
    }

    playBtn.addEventListener('click', togglePlay);
    miniPlayBtn.addEventListener('click', togglePlay);

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

    // Volume
    if (volumeControl) {
        volumeControl.addEventListener('input', function() {
            musicPlayer.volume = this.value;
        });
        musicPlayer.volume = volumeControl.value;
    }

    // Fechar modal
    document.querySelector('#music-modal .close-modal').addEventListener('click', () => {
        musicModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === musicModal) {
            musicModal.style.display = 'none';
        }
    });

    // Tabs de música
    document.querySelectorAll('.music-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadMusic(this.dataset.section);
        });
    });

    // Carregar músicas ao abrir seção
    document.querySelector('nav').addEventListener('click', (e) => {
        if (e.target.dataset.section === 'openings') {
            document.querySelector('.music-tab[data-section="openings"]').click();
        } else if (e.target.dataset.section === 'osts') {
            document.querySelector('.music-tab[data-section="osts"]').click();
        }
    });

    // Inicialização
    loadAnimeData();

    miniFullscreenBtn.addEventListener('click', () => {
        musicModal.style.display = 'flex';
    });
});
