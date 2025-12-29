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

    // Rebind login/profile openers if needed
    function rebindLoginProfileOpeners() {
        const loginBtn = document.getElementById('login-btn');
        const headerAvatar = document.getElementById('header-avatar');
        
        if (loginBtn) {
            // Remove existing listeners and add new one
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
            
            newLoginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof openProfileModal === 'function') {
                    openProfileModal();
                } else {
                    const modal = document.getElementById('profile-modal');
                    if (modal) modal.style.display = 'block';
                }
            });
        }
        
        if (headerAvatar) {
            headerAvatar.addEventListener('click', function(e) {
                e.preventDefault();
                // Avatar click should open profile selection
                // Fallback chain handles different loading states of profile-multi.js
                // since scripts load with defer, we need to check function availability
                if (typeof showProfileSelectionScreen === 'function') {
                    showProfileSelectionScreen();
                } else if (typeof openProfileModal === 'function') {
                    openProfileModal();
                } else {
                    const modal = document.getElementById('profile-modal');
                    if (modal) modal.style.display = 'block';
                }
            });
        }
    }

    // Initialize on DOM ready
    function init() {
        // Wait for animeDB to be loaded
        if (window.animeDB && animeDB.animes) {
            normalizeThumbnailUrls();
        } else {
            window.addEventListener('animeDataLoaded', normalizeThumbnailUrls);
        }
        
        // Rebind profile openers
        setTimeout(rebindLoginProfileOpeners, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
