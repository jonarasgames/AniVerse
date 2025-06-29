class AnimeDatabase {
    constructor() {
        this.animes = [];
        this.watchedEpisodes = JSON.parse(localStorage.getItem('watchedEpisodes')) || {};
        this.continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || {};
        this.ratings = JSON.parse(localStorage.getItem('episodeRatings')) || {};
        this.userRatings = JSON.parse(localStorage.getItem('userEpisodeRatings')) || {};
        this.profile = JSON.parse(localStorage.getItem('userProfile')) || null;
        this.customVideos = JSON.parse(localStorage.getItem('customVideos')) || {};
        
        this.loadData().then(() => {
            window.dispatchEvent(new Event('animeDataLoaded'));
        });
    }

    async loadData() {
        try {
            const response = await fetch('anime-data.json');
            this.animes = await response.json();
            this.sortAnimesByDate();
        } catch (error) {
            console.error("Erro ao carregar dados dos animes:", error);
            this.animes = [];
        }
    }

    sortAnimesByDate() {
        this.animes.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }

    getAnimesByType(type) {
        return this.animes.filter(anime => anime.type === type);
    }

    getNewReleases(limit = 6) {
        return this.animes.slice(0, limit);
    }

    getContinueWatching() {
        return Object.keys(this.continueWatching).map(id => {
            const anime = this.animes.find(a => a.id == id) || this.getCustomAnime(id);
            if (anime) {
                return {
                    ...anime,
                    progress: this.continueWatching[id].progress,
                    episode: this.continueWatching[id].episode,
                    season: this.continueWatching[id].season
                };
            }
            return null;
        }).filter(Boolean);
    }

    getAnimeById(id) {
        return this.animes.find(anime => anime.id == id) || this.getCustomAnime(id);
    }

    getCustomAnime(id) {
        if (this.customVideos[id]) {
            return {
                id: id,
                title: this.customVideos[id].title || "Vídeo Customizado",
                thumbnail: "https://i.ibb.co/0jq7R0y/anime-bg.jpg",
                description: "Vídeo adicionado manualmente",
                type: "custom",
                seasons: [{
                    number: 1,
                    episodes: Object.values(this.customVideos[id].episodes)
                }]
            };
        }
        return null;
    }

    addCustomVideo(animeId, title, seasonNumber, episodeNumber, videoUrl) {
        if (!animeId || !videoUrl) return false;

        if (!this.customVideos[animeId]) {
            this.customVideos[animeId] = {
                title: title || `Vídeo ${animeId}`,
                episodes: {}
            };
        }

        const episodeKey = `s${seasonNumber}e${episodeNumber}`;
        this.customVideos[animeId].episodes[episodeKey] = {
            number: episodeNumber,
            title: title || `Episódio ${episodeNumber}`,
            duration: 0,
            videoUrl: videoUrl
        };

        localStorage.setItem('customVideos', JSON.stringify(this.customVideos));
        return true;
    }

    markEpisodeWatched(animeId, seasonNumber, episodeNumber) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}`;
        this.watchedEpisodes[key] = true;
        localStorage.setItem('watchedEpisodes', JSON.stringify(this.watchedEpisodes));
    }

    saveContinueWatching(animeId, seasonNumber, episodeNumber, currentTime) {
        const anime = this.getAnimeById(animeId);
        if (!anime) return;

        let duration = 1200; // Default 20 minutes
        const season = anime.seasons[seasonNumber - 1];
        if (season && season.episodes[episodeNumber - 1]) {
            duration = season.episodes[episodeNumber - 1].duration || duration;
        }

        const progress = (currentTime / duration) * 100;

        this.continueWatching[animeId] = {
            season: seasonNumber,
            episode: episodeNumber,
            progress: progress,
            timestamp: new Date().getTime()
        };

        const entries = Object.entries(this.continueWatching);
        if (entries.length > 10) {
            const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            this.continueWatching = Object.fromEntries(sorted.slice(0, 10));
        }

        localStorage.setItem('continueWatching', JSON.stringify(this.continueWatching));
    }

    rateEpisode(animeId, seasonNumber, episodeNumber, isLike) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}`;
        const userKey = `${animeId}-${seasonNumber}-${episodeNumber}-user`;
        
        const previousRating = this.userRatings[userKey];
        
        if (!this.ratings[key]) {
            this.ratings[key] = { likes: 0, dislikes: 0 };
        }
        
        if (previousRating === 'like') {
            this.ratings[key].likes -= 1;
        } else if (previousRating === 'dislike') {
            this.ratings[key].dislikes -= 1;
        }
        
        if (isLike === true) {
            this.ratings[key].likes += 1;
            this.userRatings[userKey] = 'like';
        } else if (isLike === false) {
            this.ratings[key].dislikes += 1;
            this.userRatings[userKey] = 'dislike';
        } else {
            delete this.userRatings[userKey];
        }
        
        localStorage.setItem('episodeRatings', JSON.stringify(this.ratings));
        localStorage.setItem('userEpisodeRatings', JSON.stringify(this.userRatings));
    }

    getEpisodeRating(animeId, seasonNumber, episodeNumber) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}`;
        return this.ratings[key] || { likes: 0, dislikes: 0 };
    }

    getUserRating(animeId, seasonNumber, episodeNumber) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}-user`;
        return this.userRatings[key] || null;
    }

    isEpisodeWatched(animeId, seasonNumber, episodeNumber) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}`;
        return !!this.watchedEpisodes[key];
    }

    saveProfile(profileData) {
        this.profile = profileData;
        localStorage.setItem('userProfile', JSON.stringify(this.profile));
    }

    getProfile() {
        return this.profile;
    }

    // Novo método para verificar se um link expirou
    isLinkExpired(videoUrl) {
        if (!videoUrl.includes('expires=')) return false;
        
        const expiresMatch = videoUrl.match(/expires=(\d+)/);
        if (!expiresMatch) return false;
        
        const expires = parseInt(expiresMatch[1]);
        const now = Math.floor(Date.now() / 1000);
        
        return now > expires;
    }
}

const animeDB = new AnimeDatabase();

window.addEventListener('animeDataLoaded', () => {
    if (typeof loadNewReleases === 'function') loadNewReleases();
    if (typeof loadContinueWatching === 'function') loadContinueWatching();
    if (typeof loadFullCatalog === 'function') loadFullCatalog();
});
