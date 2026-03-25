/*
 * js/music-player-mini-plugin.js
 * Plugin layer for music mini-player presentation.
 *
 * Responsibilities:
 * - Inject CSS adjustments specific to #music-mini-player.
 * - Keep UI behavior isolated from playback core (js/music-player.js).
 *
 * Guardrail:
 * - This file must remain a plugin-only layer. Playback logic belongs to
 *   js/music-player.js to avoid duplicated player implementations.
 */
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
                z-index: 1500;
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
        console.log('✅ Music mini-player plugin loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
