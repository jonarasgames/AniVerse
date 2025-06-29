async function openAnimeModal(anime, seasonNumber = 1, episodeNumber = 1) {
    const modal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('anime-player');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const likesCount = document.getElementById('likes-count');
    const dislikesCount = document.getElementById('dislikes-count');
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    
    videoTitle.textContent = anime.title;
    videoDescription.textContent = anime.description;
    
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
    
    // Configurar temporadas
    seasonSelect.innerHTML = '';
    anime.seasons.forEach((season, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = `Temporada ${index + 1}`;
        if (index + 1 === seasonNumber) option.selected = true;
        seasonSelect.appendChild(option);
    });
    
    updateEpisodes();
    loadEpisode(anime, seasonNumber, episodeNumber);
    
    modal.style.display = 'block';
    
    async function loadEpisode(anime, seasonNum, episodeNum) {
        const season = anime.seasons[seasonNum - 1];
        const episode = season.episodes[episodeNum - 1];
        
        try {
            const videoUrl = await animeDB.getVideoUrl(episode);
            videoPlayer.src = videoUrl;
            videoTitle.textContent = `${anime.title} - ${episode.title}`;
            
            if (animeDB.continueWatching[anime.id] && 
                animeDB.continueWatching[anime.id].season == seasonNum && 
                animeDB.continueWatching[anime.id].episode == episodeNum) {
                videoPlayer.currentTime = (animeDB.continueWatching[anime.id].progress / 100) * episode.duration;
            } else {
                videoPlayer.currentTime = 0;
            }
            
            await videoPlayer.play().catch(async error => {
                console.error("Erro ao reproduzir:", error);
                // Tentar fallback se houver
                if (episode.fallbackUrl) {
                    videoPlayer.src = episode.fallbackUrl;
                    await videoPlayer.play().catch(e => {
                        console.error("Erro ao reproduzir fallback:", e);
                        showErrorModal();
                    });
                } else {
                    showErrorModal();
                }
            });
        } catch (error) {
            console.error("Erro ao carregar episódio:", error);
            showErrorModal();
        }
    }
    
    function showErrorModal() {
        alert("Não foi possível carregar o vídeo. Tente novamente mais tarde.");
    }
    
    const closeModal = document.querySelector('.close-modal');
    
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
        videoPlayer.pause();
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            videoPlayer.pause();
        }
    });
}
