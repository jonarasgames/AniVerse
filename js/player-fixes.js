/* js/player-fixes.js - Enhanced video player fixes and initialization */
(function() {
    'use strict';

    function getBufferedAheadSeconds(player) {
        try {
            if (!player || !player.buffered || !player.buffered.length) return 0;
            const now = Number(player.currentTime) || 0;
            for (let i = 0; i < player.buffered.length; i += 1) {
                const start = player.buffered.start(i);
                const end = player.buffered.end(i);
                if (now >= start && now <= end) {
                    return Math.max(0, end - now);
                }
            }
        } catch (_) {}
        return 0;
    }

    async function probeRangeSupport(url) {
        if (!url || url.startsWith('blob:')) return { supported: null, reason: 'blob' };
        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: { Range: 'bytes=0-1' },
                mode: 'cors',
                cache: 'no-store'
            });
            return {
                supported: resp.status === 206,
                status: resp.status,
                acceptRanges: resp.headers.get('accept-ranges') || ''
            };
        } catch (error) {
            return { supported: null, reason: 'cors-or-network', error: String(error) };
        }
    }

    function initPlayerFixes() {
        const player = document.getElementById('anime-player');
        if (!player) {
            console.warn('player-fixes.js: #anime-player not found');
            return;
        }

        player.setAttribute('playsinline', '');
        player.setAttribute('webkit-playsinline', 'true');
        player.setAttribute('crossorigin', 'anonymous');
        player.preload = 'auto';

        const stallState = {
            attempts: 0,
            maxAttempts: 6,
            inRecovery: false,
            lastAt: 0,
            timer: null,
            lastSrc: ''
        };

        const clearRecoveryTimer = () => {
            if (stallState.timer) {
                clearTimeout(stallState.timer);
                stallState.timer = null;
            }
        };

        const resetStallState = () => {
            stallState.inRecovery = false;
            stallState.attempts = 0;
            clearRecoveryTimer();
        };

        const recoverFromStall = (reason) => {
            const now = Date.now();
            if (stallState.inRecovery) return;
            if (now - stallState.lastAt < 700) return;
            if (stallState.attempts >= stallState.maxAttempts) {
                showVideoError('Internet/servidor instável. Tentando manter a reprodução...');
                return;
            }

            stallState.lastAt = now;
            stallState.attempts += 1;
            stallState.inRecovery = true;

            const bufferedAhead = getBufferedAheadSeconds(player);
            const hasSource = !!(player.currentSrc || player.src);

            // Recovery strategy: do not reload from scratch; try lightweight resume first.
            if (hasSource && bufferedAhead >= 0.4) {
                player.play().catch(() => {});
                stallState.inRecovery = false;
                return;
            }

            if (hasSource) {
                try {
                    const jumpTo = Math.max(0, (Number(player.currentTime) || 0) - 0.2);
                    player.currentTime = jumpTo;
                } catch (_) {}
            }

            clearRecoveryTimer();
            stallState.timer = setTimeout(() => {
                player.play().catch(() => {});
                stallState.inRecovery = false;
            }, 450);

            showVideoError(`Conexão instável. Recuperando reprodução (${stallState.attempts}/${stallState.maxAttempts})...`);
            if (reason === 'stalled') {
                console.warn('Player: Stalled - recovery attempt', stallState.attempts);
            }
        };

        player.addEventListener('loadstart', function() {
            clearVideoError();
            const src = player.currentSrc || player.src || '';
            if (src && stallState.lastSrc !== src) {
                stallState.lastSrc = src;
                resetStallState();
                probeRangeSupport(src).then((result) => {
                    window.__lastTvRangeProbe = { src, ...result, at: Date.now() };
                    if (result.supported === false) {
                        console.warn('Range request não suportado (status != 206). O streaming pode travar neste host.', result);
                    }
                }).catch(() => {});
            }
        });

        player.addEventListener('loadedmetadata', function() {
            clearVideoError();
        });

        player.addEventListener('canplay', function() {
            clearVideoError();
            stallState.inRecovery = false;
        });

        player.addEventListener('playing', function() {
            clearVideoError();
            resetStallState();
        });

        player.addEventListener('progress', function() {
            if (getBufferedAheadSeconds(player) >= 1.2) {
                clearVideoError();
            }
        });

        player.addEventListener('waiting', function() {
            recoverFromStall('waiting');
        });

        player.addEventListener('stalled', function() {
            recoverFromStall('stalled');
        });

        // Keep click-to-toggle for non-TV environments only.
        player.addEventListener('click', function() {
            if (typeof window.__isTvMode === 'function' && window.__isTvMode()) return;
            if (player.paused) {
                player.play().catch(err => {
                    console.error('Play failed:', err);
                    showVideoError('Erro ao reproduzir. Tente novamente.');
                });
            } else {
                player.pause();
            }
        });

        // Keyboard shortcuts for desktop fallback only. TV mode has dedicated remote handling.
        document.addEventListener('keydown', function(e) {
            if (typeof window.__isTvMode === 'function' && window.__isTvMode()) return;
            const modal = document.getElementById('video-modal');
            if (!modal || (!modal.classList.contains('show') && modal.style.display !== 'flex')) return;

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
                    player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
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
                case 'f': {
                    e.preventDefault();
                    const fullscreenBtn = document.getElementById('fullscreen-btn');
                    if (fullscreenBtn) fullscreenBtn.click();
                    break;
                }
                default:
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlayerFixes);
    } else {
        initPlayerFixes();
    }

    window.playerFixesShowError = showVideoError;
    window.playerFixesClearError = clearVideoError;
})();
