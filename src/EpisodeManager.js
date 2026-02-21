// Prevent updating progress and reset to the beginning for unwatched episodes
class EpisodeManager {
    constructor() {
        this.episodes = [];
        this.currentEpisodeIndex = 0;
    }

    preloadEpisodes() {
        // Logic to preload episodes
        for (const episode of this.episodes) {
            // Prevent updating the progress
            if (!episode.hasBeenWatched) {
                episode.progress = 0; // Start from the beginning
            }
        }
    }

    startNextEpisode() {
        const nextEpisode = this.episodes[this.currentEpisodeIndex + 1];
        if (nextEpisode) {
            if (!nextEpisode.hasBeenWatched) {
                nextEpisode.progress = 0; // Start from the beginning
            }
            this.currentEpisodeIndex += 1;
            this.playEpisode(nextEpisode);
        }
    }

    playEpisode(episode) {
        // Logic to play the selected episode
    }
}