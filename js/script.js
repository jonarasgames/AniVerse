document.addEventListener('DOMContentLoaded', function() {
    // Modo Escuro/Claro
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeStyle = document.getElementById('dark-mode-style');
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Verificar preferência do sistema ou localStorage
    const currentMode = localStorage.getItem('darkMode') || (prefersDarkMode ? 'enabled' : 'disabled');
    
    if (currentMode === 'enabled') {
        darkModeStyle.removeAttribute('disabled');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    darkModeToggle.addEventListener('click', function() {
        if (darkModeStyle.disabled) {
            darkModeStyle.removeAttribute('disabled');
            localStorage.setItem('darkMode', 'enabled');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            darkModeStyle.setAttribute('disabled', 'true');
            localStorage.setItem('darkMode', 'disabled');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
    
    // Navegação entre seções
    const navLinks = document.querySelectorAll('nav a');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section') + '-section';
            
            // Atualizar navegação ativa
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar seção correspondente
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
            
            // Carregar conteúdo específico da seção
            if (sectionId === 'animes-section') {
                loadAnimeSection('anime');
            } else if (sectionId === 'movies-section') {
                loadAnimeSection('movie');
            } else if (sectionId === 'ovas-section') {
                loadAnimeSection('ova');
            } else if (sectionId === 'continue-section') {
                loadContinueWatching();
            }
        });
    });
    
    // Carregar conteúdo inicial
    setTimeout(() => {
        loadNewReleases();
        loadContinueWatching();
    }, 300);
    
    // Busca
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
            const results = animeDB.animes.filter(anime => 
                anime.title.toLowerCase().includes(query) || 
                anime.description.toLowerCase().includes(query)
            );
            
            renderSearchResults(results);
        }
    }
    
    function renderSearchResults(results) {
        const homeSection = document.getElementById('home-section');
        homeSection.innerHTML = `
            <h2 class="section-title">Resultados da Busca</h2>
            <div class="anime-grid" id="search-results-grid"></div>
        `;
        
        const grid = document.getElementById('search-results-grid');
        if (results.length > 0) {
            renderAnimeGrid(results, grid);
        } else {
            grid.innerHTML = '<p class="no-results">Nenhum anime encontrado. Tente outro termo de busca.</p>';
        }
    }
});

function loadNewReleases() {
    const newReleases = animeDB.getNewReleases();
    renderAnimeGrid(newReleases, 'new-releases-grid');
}

function loadAnimeSection(type) {
    const sectionId = `${type}s-grid`;
    const animes = animeDB.getAnimesByType(type);
    renderAnimeGrid(animes, sectionId);
}

function loadContinueWatching() {
    const continueList = animeDB.getContinueWatching();
    renderContinueWatchingGrid(continueList, 'continue-watching-grid');
    renderContinueWatchingGrid(continueList, 'continue-grid');
}

function renderAnimeGrid(animes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    animes.forEach(anime => {
        const animeCard = document.createElement('div');
        animeCard.className = 'anime-card';
        animeCard.dataset.id = anime.id;
        
        // Verificar se há progresso de assistir
        const continueData = animeDB.continueWatching[anime.id];
        const progressBar = continueData ? `<div class="progress-bar" style="width: ${continueData.progress}%"></div>` : '';
        
        animeCard.innerHTML = `
            <div class="anime-thumbnail">
                <img src="${anime.thumbnail}" alt="${anime.title}">
                <iframe class="anime-trailer" src="${anime.trailer}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                ${progressBar}
            </div>
            <div class="anime-info">
                <h3 class="anime-title">${anime.title}</h3>
                <div class="anime-meta">
                    <span>${anime.year}</span>
                    <span>${anime.rating} <i class="fas fa-star" style="color: gold;"></i></span>
                </div>
            </div>
        `;
        
        animeCard.addEventListener('click', function() {
            openAnimeModal(anime);
        });
        
        // Configurar eventos para o trailer
        const trailer = animeCard.querySelector('.anime-trailer');
        animeCard.addEventListener('mouseenter', function() {
            if (trailer) {
                trailer.src = trailer.src.replace('autoplay=0', 'autoplay=1');
            }
        });
        
        animeCard.addEventListener('mouseleave', function() {
            if (trailer) {
                trailer.src = trailer.src.replace('autoplay=1', 'autoplay=0');
                trailer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        });
        
        container.appendChild(animeCard);
    });
}

function renderContinueWatchingGrid(animes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (animes.length === 0) {
        container.innerHTML = '<p class="no-results">Você ainda não começou a assistir nenhum anime.</p>';
        return;
    }
    
    animes.forEach(anime => {
        const animeCard = document.createElement('div');
        animeCard.className = 'anime-card';
        animeCard.dataset.id = anime.id;
        
        animeCard.innerHTML = `
            <div class="anime-thumbnail">
                <img src="${anime.thumbnail}" alt="${anime.title}">
                <div class="progress-bar" style="width: ${anime.progress}%"></div>
                <div class="watched-badge">Continuar</div>
            </div>
            <div class="anime-info">
                <h3 class="anime-title">${anime.title}</h3>
                <div class="anime-meta">
                    <span>Episódio ${anime.episode}</span>
                    <span>${Math.round(anime.progress)}%</span>
                </div>
            </div>
        `;
        
        animeCard.addEventListener('click', function() {
            openAnimeModal(anime, anime.season, anime.episode);
        });
        
        container.appendChild(animeCard);
    });
}

function openAnimeModal(anime, seasonNumber = 1, episodeNumber = 1) {
    const modal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('anime-player');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const likesCount = document.getElementById('likes-count');
    const dislikesCount = document.getElementById('dislikes-count');
    
    // Configurar informações do anime
    videoTitle.textContent = anime.title;
    videoDescription.textContent = anime.description;
    
    // Configurar temporadas
    seasonSelect.innerHTML = '';
    anime.seasons.forEach((season, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = `Temporada ${index + 1}`;
        if (index + 1 === seasonNumber) option.selected = true;
        seasonSelect.appendChild(option);
    });
    
    // Configurar episódios
    function updateEpisodes() {
        episodeSelect.innerHTML = '';
        const selectedSeason = seasonSelect.value;
        const season = anime.seasons[selectedSeason - 1];
        
        season.episodes.forEach((episode, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = `Episódio ${index + 1}: ${episode.title}`;
            if (animeDB.isEpisodeWatched(anime.id, selectedSeason, index + 1)) {
                option.classList.add('watched');
            }
            if (index + 1 === episodeNumber) option.selected = true;
            episodeSelect.appendChild(option);
        });
        
        // Atualizar contagem de likes/dislikes
        const rating = animeDB.getEpisodeRating(anime.id, selectedSeason, episodeNumber);
        likesCount.textContent = rating.likes;
        dislikesCount.textContent = rating.dislikes;
    }
    
    seasonSelect.addEventListener('change', function() {
        episodeNumber = 1;
        updateEpisodes();
        loadEpisode(anime, this.value, episodeNumber);
    });
    
    episodeSelect.addEventListener('change', function() {
        episodeNumber = this.value;
        loadEpisode(anime, seasonSelect.value, episodeNumber);
    });
    
    // Configurar botões de like/dislike
    document.getElementById('like-btn').addEventListener('click', function() {
        animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, true);
        const rating = animeDB.getEpisodeRating(anime.id, seasonSelect.value, episodeSelect.value);
        likesCount.textContent = rating.likes;
        this.classList.add('active');
        document.getElementById('dislike-btn').classList.remove('active');
    });
    
    document.getElementById('dislike-btn').addEventListener('click', function() {
        animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, false);
        const rating = animeDB.getEpisodeRating(anime.id, seasonSelect.value, episodeSelect.value);
        dislikesCount.textContent = rating.dislikes;
        this.classList.add('active');
        document.getElementById('like-btn').classList.remove('active');
    });
    
    // Carregar episódio inicial
    updateEpisodes();
    loadEpisode(anime, seasonNumber, episodeNumber);
    
    // Mostrar modal
    modal.style.display = 'block';
    
    function loadEpisode(anime, seasonNum, episodeNum) {
        const season = anime.seasons[seasonNum - 1];
        const episode = season.episodes[episodeNum - 1];
        
        videoPlayer.src = episode.videoUrl;
        videoTitle.textContent = `${anime.title} - ${episode.title}`;
        
        // Verificar se há progresso salvo
        if (animeDB.continueWatching[anime.id] && 
            animeDB.continueWatching[anime.id].season == seasonNum && 
            animeDB.continueWatching[anime.id].episode == episodeNum) {
            videoPlayer.currentTime = (animeDB.continueWatching[anime.id].progress / 100) * episode.duration;
        } else {
            videoPlayer.currentTime = 0;
        }
        
        videoPlayer.play().catch(e => console.log("Autoplay bloqueado:", e));
    }
    
    // Salvar progresso periodicamente
    const saveInterval = setInterval(() => {
        if (!videoPlayer.paused) {
            animeDB.saveContinueWatching(
                anime.id, 
                seasonSelect.value, 
                episodeSelect.value, 
                videoPlayer.currentTime
            );
        }
    }, 5000);
    
    // Quando o vídeo terminar
    videoPlayer.onended = function() {
        animeDB.markEpisodeWatched(anime.id, seasonSelect.value, episodeSelect.value);
        clearInterval(saveInterval);
        
        // Marcar como assistido no select
        const options = episodeSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value == episodeSelect.value) {
                options[i].classList.add('watched');
                break;
            }
        }
    };
    
    // Fechar modal
    const closeModal = document.querySelector('.close-modal');
    
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
        videoPlayer.pause();
        clearInterval(saveInterval);
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            videoPlayer.pause();
            clearInterval(saveInterval);
        }
    });
}
