class AnimeDatabase {
    constructor() {
        this.animes = [];
        this.watchedEpisodes = JSON.parse(localStorage.getItem('watchedEpisodes')) || {};
        this.continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || {};
        this.ratings = JSON.parse(localStorage.getItem('episodeRatings')) || {};
        this.userRatings = JSON.parse(localStorage.getItem('userEpisodeRatings')) || {};
        this.profile = JSON.parse(localStorage.getItem('userProfile')) || null;
        this.loadData();
    }

    async loadData() {
        try {
            const response = await fetch('anime-data.json');
            this.animes = await response.json();
            this.sortAnimesByDate();
        } catch (error) {
            console.error("Erro ao carregar dados dos animes:", error);
            // Dados de fallback
            this.animes = [
                {
                    "id": 1,
                    "title": "Attack on Titan",
                    "description": "Em um mundo onde a humanidade vive dentro de cidades cercadas por três enormes muralhas que os protegem dos gigantescos humanóides devoradores de humanos chamados de Titãs.",
                    "thumbnail": "https://i.ibb.co/0jq7R0y/anime-bg.jpg",
                    "trailer": "https://www.youtube.com/embed/MGRm4IzK1SQ?autoplay=1&mute=1&enablejsapi=1",
                    "type": "anime",
                    "dateAdded": "2023-10-15",
                    "categories": ["action", "drama", "fantasy"],
                    "seasons": [
                        {
                            "number": 1,
                            "episodes": [
                                {
                                    "title": "Episódio 1: Ao Grito de 'Você Está Livre'",
                                    "videoUrl": "https://stream.4nm-cdn-0483964.com/b-14/ani-ni-tsukeru-kusuri-wa-nai-fandublado-ef56c193/dubbed/1/86f78ee3-1f80-40e5-8352-e8d2aff0da8f/stream.mp4",
                                    "duration": 1440
                                }
                            ]
                        }
                    ],
                    "year": 2013,
                    "rating": 4.8
                }
            ];
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
            const anime = this.animes.find(a => a.id == id);
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
        return this.animes.find(anime => anime.id == id);
    }

    markEpisodeWatched(animeId, seasonNumber, episodeNumber) {
        const key = `${animeId}-${seasonNumber}-${episodeNumber}`;
        this.watchedEpisodes[key] = true;
        localStorage.setItem('watchedEpisodes', JSON.stringify(this.watchedEpisodes));
    }

    saveContinueWatching(animeId, seasonNumber, episodeNumber, currentTime) {
        const anime = this.getAnimeById(animeId);
        if (!anime) return;

        const episode = anime.seasons[seasonNumber - 1].episodes[episodeNumber - 1];
        const progress = (currentTime / episode.duration) * 100;

        this.continueWatching[animeId] = {
            season: seasonNumber,
            episode: episodeNumber,
            progress: progress,
            timestamp: new Date().getTime()
        };

        // Manter apenas os 10 mais recentes
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
        
        // Verificar avaliação anterior do usuário
        const previousRating = this.userRatings[userKey];
        
        if (!this.ratings[key]) {
            this.ratings[key] = { likes: 0, dislikes: 0 };
        }
        
        // Remover avaliação anterior se existir
        if (previousRating === 'like') {
            this.ratings[key].likes -= 1;
        } else if (previousRating === 'dislike') {
            this.ratings[key].dislikes -= 1;
        }
        
        // Adicionar nova avaliação
        if (isLike === true) {
            this.ratings[key].likes += 1;
            this.userRatings[userKey] = 'like';
        } else if (isLike === false) {
            this.ratings[key].dislikes += 1;
            this.userRatings[userKey] = 'dislike';
        } else {
            // Remover avaliação
            this.userRatings[userKey] = null;
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
}

const animeDB = new AnimeDatabase();
