/* js/player-fixes.js - Enhanced video player fixes and initialization */
(function() {
    'use strict';

    // Wait for DOM to be ready
    function initPlayerFixes() {
        const player = document.getElementById('anime-player');
        if (!player) {
            console.warn('player-fixes.js: #anime-player not found');
            return;
        }

        // Fix: Ensure player has proper initialization
        player.addEventListener('loadstart', function() {
            console.log('Player: Loading video...');
            clearVideoError();
        });

        player.addEventListener('loadedmetadata', function() {
            console.log('Player: Metadata loaded');
        });

        player.addEventListener('canplay', function() {
            console.log('Player: Can play');
            clearVideoError();
        });

        player.addEventListener('waiting', function() {
            console.log('Player: Buffering...');
        });

        player.addEventListener('stalled', function() {
            console.warn('Player: Stalled');
            showVideoError('Carregamento pausado. Verificando conexão...');
        });

        // Fix: Handle player clicks for play/pause
        player.addEventListener('click', function() {
            if (player.paused) {
                player.play().catch(err => {
                    console.error('Play failed:', err);
                    showVideoError('Erro ao reproduzir. Tente novamente.');
                });
            } else {
                player.pause();
            }
        });

        // Fix: Keyboard controls
        document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('video-modal');
            if (!modal || !modal.classList.contains('show') && modal.style.display !== 'flex') return;

            switch(e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (player.paused) {
                        player.play();
                    } else {
                        player.pause();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    player.currentTime = Math.max(0, player.currentTime - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    player.currentTime = Math.min(player.duration, player.currentTime + 5);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    player.volume = Math.min(1, player.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    player.volume = Math.max(0, player.volume - 0.1);
                    break;
                case 'm':
                    e.preventDefault();
                    player.muted = !player.muted;
                    break;
                case 'f':
                    e.preventDefault();
                    const fullscreenBtn = document.getElementById('fullscreen-btn');
                    if (fullscreenBtn) fullscreenBtn.click();
                    break;
            }
        });

        console.log('player-fixes.js: Initialized successfully');
    }

    function showVideoError(msg) {
        let el = document.getElementById('video-error-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'video-error-container';
            Object.assign(el.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                padding: '15px 20px',
                borderRadius: '8px',
                zIndex: '100010',
                pointerEvents: 'none',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                textAlign: 'center',
                maxWidth: '80%'
            });
            const container = document.getElementById('video-player-container');
            if (container) {
                container.appendChild(el);
            } else {
                document.body.appendChild(el);
            }
        }
        el.textContent = msg;
    }

    function clearVideoError() {
        const el = document.getElementById('video-error-container');
        if (el) el.remove();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlayerFixes);
    } else {
        initPlayerFixes();
    }

    // Export functions to window
    window.playerFixesShowError = showVideoError;
    window.playerFixesClearError = clearVideoError;
})();
