document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeStyle = document.getElementById('dark-mode-style');
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
    
    const navLinks = document.querySelectorAll('nav a');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section') + '-section';
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
            
            if (sectionId === 'animes-section') {
                loadAnimeSection('anime');
            } else if (sectionId === 'movies-section') {
                loadAnimeSection('movie');
            } else if (sectionId === 'ovas-section') {
                loadAnimeSection('ova');
            } else if (sectionId === 'continue-section') {
                loadContinueWatching();
            } else if (sectionId === 'openings-section') {
                // Load music player if available
                if (window.animeDB && typeof loadMusic === 'function') {
                    try {
                        loadMusic('themes');
                    } catch (e) {
                        console.warn('Error loading music:', e);
                    }
                }
            } else if (sectionId === 'info-section') {
            }
        });
    });
    
    const grids = document.querySelectorAll('.anime-grid');
    grids.forEach(grid => {
        grid.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner"></i>
                <p>Carregando animes...</p>
            </div>
        `;
    });

    setTimeout(() => {
        checkAnimeDBLoaded();
        updateProfileDisplay();
    }, 300);
    
    document.querySelectorAll('.terms-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('terms-modal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    document.querySelectorAll('.privacy-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('privacy-modal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    document.querySelector('.close-terms')?.addEventListener('click', function() {
        const modal = document.getElementById('terms-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    document.querySelector('.close-privacy')?.addEventListener('click', function() {
        const modal = document.getElementById('privacy-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        const termsModal = document.getElementById('terms-modal');
        const privacyModal = document.getElementById('privacy-modal');
        if (e.target === termsModal) {
            termsModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === privacyModal) {
            privacyModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    document.getElementById('login-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        openProfileModal();
    });
    
    setupProfileModal();
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
});

function checkAnimeDBLoaded() {
    if (window.animeDB && animeDB.animes && animeDB.animes.length > 0) {
        loadNewReleases();
        loadContinueWatching();
        loadFullCatalog();
        setupCategoryTabs();
    } else {
        setTimeout(checkAnimeDBLoaded, 100);
    }
}

function loadNewReleases() {
    if (!window.animeDB) return;
    const newReleases = animeDB.getNewReleases();
    renderAnimeGrid(newReleases, 'new-releases-grid');
}

function loadFullCatalog() {
    if (!window.animeDB) return;
    renderAnimeGrid(animeDB.animes, 'full-catalog-grid');
}

function loadAnimeSection(type) {
    if (!window.animeDB) return;
    const sectionId = `${type}s-grid`;
    const animes = animeDB.getAnimesByType(type);
    renderAnimeGrid(animes, sectionId);
}

function loadContinueWatching() {
    if (!window.animeDB) return;
    const continueList = animeDB.getContinueWatching();
    renderContinueWatchingGrid(continueList, 'continue-watching-grid');
    renderContinueWatchingGrid(continueList, 'continue-grid');
    
    // Show/hide clear history button
    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) {
        clearBtn.style.display = continueList.length > 0 ? 'block' : 'none';
    }
}

// Clear history handler
document.addEventListener('DOMContentLoaded', function() {
    // Handler for both clear history buttons
    const clearHistoryBtns = [
        document.getElementById('clear-history-btn'),
        document.getElementById('clear-history-btn-2')
    ].filter(Boolean);
    
    clearHistoryBtns.forEach(clearHistoryBtn => {
        clearHistoryBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja limpar todo o histórico de visualização?')) {
                // Clear continue watching
                localStorage.removeItem('continueWatching');
                localStorage.removeItem('watchedEpisodes');
                
                // Clear from animeDB
                if (window.animeDB) {
                    animeDB.continueWatching = {};
                    animeDB.watchedEpisodes = {};
                }
                
                // Re-render the grids
                const grids = ['continue-watching-grid', 'continue-grid'];
                grids.forEach(gridId => {
                    const grid = document.getElementById(gridId);
                    if (grid) {
                        grid.innerHTML = '<p class="no-results">Você ainda não começou a assistir nenhum anime.</p>';
                    }
                });
                
                // Hide all clear history buttons
                clearHistoryBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                
                alert('Histórico limpo com sucesso!');
            }
        });
    });
});

function setupCategoryTabs() {
    const categoryTabs = document.querySelectorAll('.category-tab');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            categoryTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            showCategoryAnimes(category);
        });
    });
}

function showCategoryAnimes(category) {
    if (!window.animeDB) return;
    const categorySections = document.querySelectorAll('.category-section');
    
    if (category === 'all') {
        categorySections.forEach(section => {
            if (section !== document.querySelector('.categories')) {
                section.remove();
            }
        });
        return;
    }
    
    let categorySection = document.getElementById(`${category}-section`);
    
    if (!categorySection) {
        const filteredAnimes = animeDB.animes.filter(anime => 
            anime.categories && anime.categories.includes(category)
        );
        
        if (filteredAnimes.length === 0) return;
        
        categorySection = document.createElement('section');
        categorySection.className = 'category-section';
        categorySection.id = `${category}-section`;
        categorySection.innerHTML = `
            <h3 class="category-title" style="text-transform: capitalize;">${category}</h3>
            <div class="anime-grid" id="${category}-animes"></div>
        `;
        
        document.querySelector('main').appendChild(categorySection);
        
        renderAnimeGrid(filteredAnimes, `${category}-animes`);
    }
}

function renderAnimeGrid(animes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (animes.length === 0) {
        container.innerHTML = '<p class="no-results">Nenhum anime encontrado.</p>';
        return;
    }
    
    animes.forEach(anime => {
        const animeCard = document.createElement('div');
        animeCard.className = 'anime-card';
        animeCard.dataset.id = anime.id;
        
        const continueData = animeDB.continueWatching[anime.id];
        const progressBar = continueData ? `<div class="progress-bar" style="width: ${continueData.progress}%"></div>` : '';
        
        const watchedCount = getWatchedEpisodesCount(anime.id);
        const watchedBadge = watchedCount > 0 ? `<div class="watched-badge">${watchedCount}/${getTotalEpisodes(anime)}</div>` : '';
        
        animeCard.innerHTML = `
            <div class="anime-thumbnail">
                <img src="${anime.thumbnail || 'images/bg-default.jpg'}" alt="${anime.title}">
                <div class="trailer-overlay">
                    <i class="fas fa-play"></i>
                    <span>Assistir</span>
                </div>
                ${progressBar}
                ${watchedBadge}
            </div>
            <div class="anime-info">
                <h3 class="anime-title">${anime.title}</h3>
                <div class="anime-meta">
                    <span>${anime.year || ''}</span>
                    <span>${anime.rating || 'N/A'} <i class="fas fa-star" style="color: gold;"></i></span>
                </div>
            </div>
        `;
        
        animeCard.addEventListener('click', function() {
            openAnimeModal(anime, anime.season, anime.episode);
        });
        
        animeCard.addEventListener('mouseenter', () => {
            const trailerUrl = anime.trailerUrl;
            if (trailerUrl) {
                const video = document.createElement('video');
                video.src = trailerUrl;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.className = 'anime-trailer-preview';
                video.style.position = 'absolute';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                video.style.zIndex = '1';

                animeCard.querySelector('.anime-thumbnail').appendChild(video);
            }
        });
        
        animeCard.addEventListener('mouseleave', () => {
            const preview = animeCard.querySelector('.anime-trailer-preview');
            if (preview) preview.remove();
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
                <img src="${anime.thumbnail || 'images/bg-default.jpg'}" alt="${anime.title}">
                <div class="progress-bar" style="width: ${anime.progress}%"></div>
                <div class="watched-badge">Continuar</div>
            </div>
            <div class="anime-info">
                <h3 class="anime-title">${anime.title}</h3>
                <div class="anime-meta">
                    <span>T${anime.season} E${anime.episode}</span>
                    <span>${Math.round(anime.progress)}%</span>
                </div>
            </div>
        `;
        
        animeCard.addEventListener('click', function() {
            openAnimeModal(anime, anime.season, anime.episode);
        });
        
        animeCard.addEventListener('mouseenter', () => {
            const trailerUrl = anime.trailerUrl;
            if (trailerUrl) {
                const video = document.createElement('video');
                video.src = trailerUrl;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.className = 'anime-trailer-preview';
                video.style.position = 'absolute';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                video.style.zIndex = '1';

                animeCard.querySelector('.anime-thumbnail').appendChild(video);
            }
        });
        
        animeCard.addEventListener('mouseleave', () => {
            const preview = animeCard.querySelector('.anime-trailer-preview');
            if (preview) preview.remove();
        });
    
        container.appendChild(animeCard);
    });
}


function openAnimeModal(anime, seasonNumber = 1, episodeNumber = 1) {
    const modal = document.getElementById('video-modal');
    if (!modal) {
        console.error('Modal de vídeo não encontrado');
        return;
    }

    const videoPlayer = document.getElementById('anime-player');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const likesCount = document.getElementById('likes-count');
    const dislikesCount = document.getElementById('dislikes-count');
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    
    if (!videoPlayer || !videoTitle || !videoDescription || !seasonSelect || !episodeSelect) {
        console.error('Elementos do modal de vídeo não encontrados');
        return;
    }
    
    videoTitle.textContent = anime.title;
    videoDescription.textContent = anime.description || "Descrição não disponível";
    
    seasonSelect.innerHTML = '';
    if (anime.seasons && anime.seasons.length > 0) {
        anime.seasons.forEach((season, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = `Temporada ${index + 1}`;
            if (index + 1 === seasonNumber) option.selected = true;
            seasonSelect.appendChild(option);
        });
    }
    
    function updateEpisodes() {
        episodeSelect.innerHTML = '';
        const selectedSeason = seasonSelect.value;
        const season = anime.seasons[selectedSeason - 1];
        
        if (season && season.episodes && season.episodes.length > 0) {
            season.episodes.forEach((episode, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.textContent = `Episódio ${index + 1}: ${episode.title || ''}`;
                if (animeDB.isEpisodeWatched(anime.id, selectedSeason, index + 1)) {
                    option.classList.add('watched');
                }
                if (index + 1 === episodeNumber) option.selected = true;
                episodeSelect.appendChild(option);
            });
            
            const rating = animeDB.getEpisodeRating(anime.id, selectedSeason, episodeNumber);
            likesCount.textContent = rating.likes;
            dislikesCount.textContent = rating.dislikes;
            
            const userRating = animeDB.getUserRating(anime.id, selectedSeason, episodeNumber);
            if (userRating === 'like') {
                likeBtn.classList.add('active');
                dislikeBtn.classList.remove('active');
            } else if (userRating === 'dislike') {
                dislikeBtn.classList.add('active');
                likeBtn.classList.remove('active');
            } else {
                likeBtn.classList.remove('active');
                dislikeBtn.classList.remove('active');
            }
        }
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
    
    likeBtn.addEventListener('click', function() {
        const currentRating = animeDB.getUserRating(anime.id, seasonSelect.value, episodeSelect.value);
        
        if (currentRating === 'like') {
            animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, null);
            this.classList.remove('active');
        } else {
            animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, true);
            this.classList.add('active');
            dislikeBtn.classList.remove('active');
        }
        
        const rating = animeDB.getEpisodeRating(anime.id, seasonSelect.value, episodeSelect.value);
        likesCount.textContent = rating.likes;
        dislikesCount.textContent = rating.dislikes;
    });
    
    dislikeBtn.addEventListener('click', function() {
        const currentRating = animeDB.getUserRating(anime.id, seasonSelect.value, episodeSelect.value);
        
        if (currentRating === 'dislike') {
            animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, null);
            this.classList.remove('active');
        } else {
            animeDB.rateEpisode(anime.id, seasonSelect.value, episodeSelect.value, false);
            this.classList.add('active');
            likeBtn.classList.remove('active');
        }
        
        const rating = animeDB.getEpisodeRating(anime.id, seasonSelect.value, episodeSelect.value);
        likesCount.textContent = rating.likes;
        dislikesCount.textContent = rating.dislikes;
    });
    
    // PiP button handler
    const pipBtn = document.getElementById('pip-btn');
    if (pipBtn && videoPlayer) {
        pipBtn.addEventListener('click', async function() {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (videoPlayer.requestPictureInPicture) {
                    await videoPlayer.requestPictureInPicture();
                } else {
                    // Fallback: create custom mini-player
                    createCustomMiniPlayer(videoPlayer);
                }
            } catch (err) {
                console.warn('PiP not supported or failed:', err);
                createCustomMiniPlayer(videoPlayer);
            }
        });
    }
    
    updateEpisodes();
    loadEpisode(anime, seasonNumber, episodeNumber);
    
    modal.style.display = 'block';

    // Configurar controles customizados
    setupCustomControls();
    
    // Substitua a função loadEpisode dentro de openAnimeModal por esta versão:
    function loadEpisode(anime, seasonNum, episodeNum) {
        const season = anime.seasons[seasonNum - 1];
        if (!season) {
            showVideoError('Temporada não encontrada');
            return;
        }

        const episode = season.episodes[episodeNum - 1];
        if (!episode) {
            showVideoError('Episódio não encontrado');
            return;
        }

        if (!episode.videoUrl) {
            showVideoError('URL do vídeo não disponível');
            return;
        }

        // ⭐⭐ NOVO: Passa os dados da abertura para o player ⭐⭐
        if (window.updateOpeningData && typeof window.updateOpeningData === 'function') {
            window.updateOpeningData(episode.opening || null);
        }
        console.log("Dados da abertura:", episode.opening); // Para debug

        // Update banner
        const banner = document.getElementById('player-banner');
        if (banner) {
            const bannerUrl = anime.banner || 'https://files.catbox.moe/fhnk72.jpg';
            banner.style.backgroundImage = `url('${bannerUrl}')`;
        }

        videoPlayer.src = episode.videoUrl;
        videoTitle.textContent = `${anime.title} - ${episode.title || `Episódio ${episodeNum}`}`;
        
        if (animeDB.continueWatching[anime.id] && 
            animeDB.continueWatching[anime.id].season == seasonNum && 
            animeDB.continueWatching[anime.id].episode == episodeNum) {
            videoPlayer.currentTime = (animeDB.continueWatching[anime.id].progress / 100) * (episode.duration || 1200);
        } else {
            videoPlayer.currentTime = 0;
        }
        
        videoPlayer.load();
        videoPlayer.play().catch(e => {
            console.log("Autoplay bloqueado:", e);
            showVideoError('Erro ao reproduzir. Clique no botão de play para tentar novamente.');
        });
    }
    
    function showVideoError(message) {
        const container = document.getElementById('video-player-container');
        if (!container) return;
        
        let errorMsg = container.querySelector('.video-error');
        
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'video-error';
            container.appendChild(errorMsg);
        }
        
        errorMsg.innerHTML = `
            <p>${message}</p>
            <button id="try-reload" class="btn btn-primary">Tentar novamente</button>
        `;
        
        document.getElementById('try-reload')?.addEventListener('click', function() {
            videoPlayer.load();
            errorMsg.remove();
            videoPlayer.play().catch(e => console.log("Erro ao reproduzir:", e));
        });
    }
    
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
    
    videoPlayer.onended = function() {
        animeDB.markEpisodeWatched(anime.id, seasonSelect.value, episodeSelect.value);
        clearInterval(saveInterval);
        
        const options = episodeSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value == episodeSelect.value) {
                options[i].classList.add('watched');
                break;
            }
        }
    };
    
    const closeModal = modal.querySelector('.close-modal');
    
    closeModal?.addEventListener('click', function() {
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


function getWatchedEpisodesCount(animeId) {
    if (!window.animeDB) return 0;
    
    let count = 0;
    const anime = animeDB.getAnimeById(animeId);
    
    if (!anime || !anime.seasons) return 0;
    
    anime.seasons.forEach(season => {
        if (season.episodes) {
            season.episodes.forEach((episode, index) => {
                if (animeDB.isEpisodeWatched(animeId, season.number, index + 1)) {
                    count++;
                }
            });
        }
    });
    
    return count;
}

function getTotalEpisodes(anime) {
    if (!anime || !anime.seasons) return 0;
    return anime.seasons.reduce((total, season) => total + (season.episodes ? season.episodes.length : 0), 0);
}


function openProfileModal() {
    if (!window.animeDB) return;
    
    const profile = animeDB.getProfile();
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    
    if (profile) {
        document.getElementById('profile-name').value = profile.name;
        document.getElementById('selected-pronoun').value = profile.pronoun;
        
        document.querySelectorAll('.pronoun-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.pronoun === profile.pronoun) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.bg-option').forEach(option => {
            option.classList.remove('selected');
            if (option.style.backgroundColor === profile.avatarBg) {
                option.classList.add('selected');
            }
        });
        
        document.querySelectorAll('.char-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.char === profile.avatarChar) {
                option.classList.add('selected');
            }
        });
        
        updateAvatarPreview();
    }
    
    modal.style.display = 'block';
}


function setupProfileModal() {
    document.querySelectorAll('.pronoun-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.pronoun-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('selected-pronoun').value = this.dataset.pronoun;
            updateAvatarPreview();
        });
    });
    
    document.querySelectorAll('.bg-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            updateAvatarPreview();
        });
    });
    
    document.querySelectorAll('.char-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.char-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            updateAvatarPreview();
        });
    });
    
    document.getElementById('profile-name')?.addEventListener('input', updateAvatarPreview);
    
    document.getElementById('save-profile')?.addEventListener('click', function() {
        const name = document.getElementById('profile-name').value.trim();
        const pronoun = document.getElementById('selected-pronoun').value;
        const selectedBgOption = document.querySelector('.bg-option.selected');
        const bgColor = selectedBgOption ? window.getComputedStyle(selectedBgOption).backgroundColor : '#ff6b6b';
        const char = document.querySelector('.char-option.selected')?.dataset.char;
        
        if (name && pronoun && bgColor && char) {
            animeDB.saveProfile({
                name,
                pronoun,
                avatarBg: bgColor,
                avatarChar: char
            });
            
            document.getElementById('profile-modal').style.display = 'none';
            updateProfileDisplay();
        } else {
            alert('Por favor, preencha todos os campos do perfil.');
        }
    });
    
    document.querySelector('.close-profile')?.addEventListener('click', function() {
        document.getElementById('profile-modal').style.display = 'none';
    });
}


function updateAvatarPreview() {
    const name = document.getElementById('profile-name')?.value || 'Nome';
    const pronoun = document.getElementById('selected-pronoun')?.value || '-san';
    const selectedBgOption = document.querySelector('.bg-option.selected');
    const bgColor = selectedBgOption ? window.getComputedStyle(selectedBgOption).backgroundColor : '#ff6b6b';
    const charImg = document.querySelector('.char-option.selected img')?.src || 'images/bg-default.jpg';
    
    const preview = document.getElementById('avatar-preview');
    if (!preview) return;
    
    const avatarBg = preview.querySelector('.avatar-bg');
    const avatarChar = preview.querySelector('.avatar-char');
    const avatarName = preview.querySelector('.avatar-name');
    
    if (avatarBg) avatarBg.style.backgroundColor = bgColor;
    if (avatarChar) avatarChar.src = charImg;
    if (avatarName) avatarName.textContent = `${name}${pronoun}`;
}


function updateProfileDisplay() {
    if (!window.animeDB) return;
    
    const profile = animeDB.getProfile();
    const loginBtn = document.getElementById('login-btn');
    const headerAvatar = document.getElementById('header-avatar');
    const headerAvatarImg = headerAvatar?.querySelector('img');
    const welcomeContainer = document.getElementById('user-welcome-container');

    if (profile) {
        if (loginBtn) loginBtn.innerHTML = `<i class="fas fa-user"></i> ${profile.name}${profile.pronoun}`;
        
        if (headerAvatar) {
            headerAvatar.style.display = 'block';
            headerAvatar.style.backgroundColor = profile.avatarBg;
            if (headerAvatarImg) {
                headerAvatarImg.src = document.querySelector(`.char-option[data-char="${profile.avatarChar}"] img`)?.src || '';
            }
        }
        
        if (welcomeContainer) {
            welcomeContainer.innerHTML = `
                <div class="welcome-avatar" style="background-color: ${profile.avatarBg}">
                    <img src="${headerAvatarImg?.src || ''}" alt="${profile.name}">
                </div>
                <div class="welcome-message">
                    Bem-vindo de volta, <span>${profile.name}${profile.pronoun}</span>!
                </div>
            `;
        }
    } else {
        if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-user"></i> Entrar';
        if (headerAvatar) headerAvatar.style.display = 'none';
        if (welcomeContainer) welcomeContainer.innerHTML = '';
    }
}


function performSearch() {
    if (!window.animeDB) return;
    
    const query = document.getElementById('search-input')?.value.trim().toLowerCase();
    if (query) {
        const results = animeDB.animes.filter(anime => 
            anime.title.toLowerCase().includes(query) ||
            (anime.description && anime.description.toLowerCase().includes(query))
        );
        
        renderSearchResults(results);
    }
}


function renderSearchResults(results) {
    const homeSection = document.getElementById('home-section');
    if (!homeSection) return;
    
    homeSection.innerHTML = `
        <h2 class="section-title">Resultados da Busca</h2>
        <div class="anime-grid" id="search-results-grid"></div>
        <button id="back-to-home" class="btn btn-primary"><i class="fas fa-arrow-left"></i> Voltar</button>
    `;
    
    const grid = document.getElementById('search-results-grid');
    if (results.length > 0) {
        renderAnimeGrid(results, grid);
    } else {
        grid.innerHTML = '<p class="no-results">Nenhum anime encontrado. Tente outro termo de busca.</p>';
    }
    
    document.getElementById('back-to-home')?.addEventListener('click', function() {
        location.reload();
    });
}


window.addEventListener('animeDataLoaded', () => {
    try {
        if (typeof loadAnimeSection === 'function') {
            loadAnimeSection('anime');
        }
    } catch (e) {
        console.warn('Error loading anime section:', e);
    }
    
    try {
        if (typeof renderContinueWatchingGrid === 'function' && window.animeDB) {
            const continueList = animeDB.getContinueWatching();
            renderContinueWatchingGrid(continueList, 'continue-watching-grid');
        }
    } catch (e) {
        console.warn('Error rendering continue watching:', e);
    }
    
    try {
        if (typeof loadNewReleases === 'function') loadNewReleases();
    } catch (e) {
        console.warn('Error loading new releases:', e);
    }
    
    try {
        if (typeof loadContinueWatching === 'function') loadContinueWatching();
    } catch (e) {
        console.warn('Error loading continue watching:', e);
    }
    
    try {
        if (typeof loadFullCatalog === 'function') loadFullCatalog();
    } catch (e) {
        console.warn('Error loading full catalog:', e);
    }
    
    try {
        if (typeof updateProfileDisplay === 'function') {
            updateProfileDisplay();
        }
    } catch (e) {
        console.warn('Error updating profile display:', e);
    }
    
    try {
        if (typeof bindProfileModalControls === 'function') {
            bindProfileModalControls();
        }
    } catch (e) {
        console.warn('Error binding profile modal controls:', e);
    }
});

// Custom mini-player fallback for browsers without PiP support
function createCustomMiniPlayer(videoPlayer) {
    // Remove existing mini-player if any
    const existing = document.getElementById('custom-mini-player');
    if (existing) existing.remove();
    
    const miniPlayer = document.createElement('div');
    miniPlayer.id = 'custom-mini-player';
    miniPlayer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-width: 90vw;
        background: black;
        border: 2px solid #333;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        z-index: 10000;
        overflow: hidden;
    `;
    
    const clonedVideo = videoPlayer.cloneNode(true);
    clonedVideo.style.width = '100%';
    clonedVideo.style.height = 'auto';
    clonedVideo.currentTime = videoPlayer.currentTime;
    clonedVideo.controls = true;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 20px;
        z-index: 10001;
    `;
    
    closeBtn.addEventListener('click', () => {
        videoPlayer.currentTime = clonedVideo.currentTime;
        miniPlayer.remove();
    });
    
    miniPlayer.appendChild(clonedVideo);
    miniPlayer.appendChild(closeBtn);
    document.body.appendChild(miniPlayer);
    
    clonedVideo.play().catch(e => console.log('Autoplay blocked:', e));
}

function loadEpisode(anime, seasonNum, episodeNum) {
    const episode = anime.seasons[seasonNum-1]?.episodes[episodeNum-1];
    if (!episode) return;

    // ⭐⭐ Envia dados APENAS se existir abertura definida ⭐⭐
    if (episode.opening?.start !== undefined) {
        window.updateOpeningData(episode.opening);
    } else {
        window.updateOpeningData(null); // Limpa dados anteriores
    }

    // Restante do seu código de carregamento...
}

// Controles customizados
function setupCustomControls() {
    const player = document.getElementById('anime-player');
    const playBtn = document.querySelector('.play-pause-btn');
    const seekSlider = document.querySelector('.seek-slider');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');

    // Return early if custom controls don't exist (using default browser controls)
    if (!playBtn || !seekSlider || !currentTimeEl || !durationEl || !fullscreenBtn) {
        return;
    }

    // Play/Pause
    playBtn.addEventListener('click', () => {
        if (player.paused) {
            player.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            player.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    // Atualiza tempo
    player.addEventListener('timeupdate', () => {
        const minutes = Math.floor(player.currentTime / 60);
        const seconds = Math.floor(player.currentTime % 60);
        currentTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        seekSlider.value = (player.currentTime / player.duration) * 100;
    });

    // Seek
    seekSlider.addEventListener('input', () => {
        const seekTo = player.duration * (seekSlider.value / 100);
        player.currentTime = seekTo;
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            player.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
}
