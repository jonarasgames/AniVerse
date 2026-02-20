/* js/music-player-new.js - Mobile-safe music mini-player enhancements */
(function() {
    'use strict';

    function ensureMiniPlayerCSS() {
        const existingStyle = document.getElementById('mini-player-enhanced-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'mini-player-enhanced-styles';
        style.textContent = `
            /* Only target the MUSIC mini-player to avoid conflict with video PiP mini-player */
            #music-mini-player {
                z-index: 10000;
            }

            #music-mini-player.hidden {
                transform: translateY(100%);
                opacity: 0;
                pointer-events: none;
            }

            #music-mini-player:not(.hidden) {
                display: flex;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        ensureMiniPlayerCSS();
        console.log('✅ Music mini-player enhancements loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
