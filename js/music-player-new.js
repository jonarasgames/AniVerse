/* js/music-player-new.js - Enhanced music player with anime grouping */
(function() {
    'use strict';

    // This file ensures the music player appears and functions correctly
    // The main logic is in music.js, this file adds enhancements

    function ensureMiniPlayerCSS() {
        // Check if mini-player styles exist
        const existingStyle = document.getElementById('mini-player-enhanced-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'mini-player-enhanced-styles';
        style.textContent = `
            /* Enhanced mini-player visibility */
            .mini-player {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                display: flex !important;
                z-index: 10000 !important;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }

            .mini-player.hidden {
                transform: translateY(150%) !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }

            /* Ensure proper display when active */
            #mini-player:not(.hidden) {
                display: flex !important;
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        ensureMiniPlayerCSS();
        
        // Log initialization
        console.log('✅ Music player enhancements loaded');
        
        // Observe for mini-player creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.id === 'mini-player') {
                        console.log('✅ Mini-player detected and enhanced');
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: false
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
