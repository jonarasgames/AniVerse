// Helper script for URL normalization and UI fixes
(function() {
    'use strict';

    // Normalize thumbnail URLs to prevent 404s
    function normalizeThumbnailUrls() {
        if (!window.animeDB || !animeDB.animes) return;
        
        animeDB.animes.forEach(anime => {
            // Fix refs/heads URLs
            if (anime.thumbnail && anime.thumbnail.includes('refs/heads')) {
                anime.thumbnail = anime.thumbnail.replace('/refs/heads/', '/');
            }
            if (anime.trailerUrl && anime.trailerUrl.includes('refs/heads')) {
                anime.trailerUrl = anime.trailerUrl.replace('/refs/heads/', '/');
            }
        });
    }

    // Initialize on DOM ready
    function init() {
        // Wait for animeDB to be loaded
        if (window.animeDB && animeDB.animes) {
            normalizeThumbnailUrls();
        } else {
            window.addEventListener('animeDataLoaded', normalizeThumbnailUrls);
        }
        
        // Profile navigation is owned by profile-multi.js.
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
