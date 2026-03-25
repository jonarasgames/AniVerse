/* js/player-fixes.js - Enhanced video player fixes and initialization */
(function() {
    'use strict';

    function isTvPlaybackEnvironment() {
        try {
            if (window.__ANIVERSE_FORCE_TV_MODE__ === true) return true;
            if (typeof window.tizen !== 'undefined' || typeof window.webapis !== 'undefined') return true;
            const ua = navigator.userAgent || '';
            return /tizen|smart-tv|smarttv|hbbtv|web0s|googletv|appletv|viera|aquos/i.test(ua);
        } catch (_) {
            return false;
        }
    }

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
        if (isTvPlaybackEnvironment()) {
            player.setAttribute('crossorigin', 'anonymous');
        } else {
            player.removeAttribute('crossorigin');
        }
        player.preload = 'auto';

        const stallState = {
            attempts: 0,
            maxAttempts: 6,
            inRecovery: false,
            lastAt: 0,
            timer: null,
            lastSrc: '',
            forceStreamWithoutAcceptRanges: false,
            blobFallbackTried: false
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



        const maybeTryBlobFallback = async () => {
            if (stallState.blobFallbackTried) return;
            if (!stallState.forceStreamWithoutAcceptRanges) return;

            const src = player.currentSrc || player.src || '';
            if (!src || src.startsWith('blob:')) return;

            stallState.blobFallbackTried = true;
            showVideoError('Tentando modo alternativo de buffer (Blob)...');

            try {
                const head = await fetch(src, { method: 'HEAD', mode: 'cors', cache: 'no-store' });
                const lenRaw = head.headers.get('content-length') || '0';
                const contentLength = Number(lenRaw);
                const maxBlobBytes = 120 * 1024 * 1024;
                if (contentLength > maxBlobBytes) {
                    showVideoError('Arquivo muito grande para fallback Blob nesta TV.');
                    return;
                }
            } catch (_) {
                // ignore HEAD errors and still try GET once
            }

            try {
                const resumeAt = Number(player.currentTime) || 0;
                const response = await fetch(src, { mode: 'cors', cache: 'no-store' });
                if (!response.ok) throw new Error(`status ${response.status}`);
                const mediaBlob = await response.blob();
                const blobUrl = URL.createObjectURL(mediaBlob);
                player.src = blobUrl;
                player.load();
                player.addEventListener('loadedmetadata', () => {
                    try { player.currentTime = Math.max(0, resumeAt - 0.2); } catch (_) {}
                    player.play().catch(() => {});
                }, { once: true });
                window.__lastTvBlobFallback = { ok: true, src, at: Date.now(), size: mediaBlob.size };
            } catch (error) {
                window.__lastTvBlobFallback = { ok: false, src, at: Date.now(), error: String(error) };
                showVideoError('Fallback Blob falhou. Host pode bloquear CORS/stream.');
            }
        };

        const recoverFromStall = (reason) => {
            const now = Date.now();
            if (stallState.inRecovery) return;
            if (now - stallState.lastAt < 700) return;
            const effectiveMaxAttempts = stallState.forceStreamWithoutAcceptRanges ? (stallState.maxAttempts + 4) : stallState.maxAttempts;
            if (stallState.attempts >= effectiveMaxAttempts) {
                maybeTryBlobFallback();
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
                stallState.blobFallbackTried = false;
                resetStallState();
                if (!isTvPlaybackEnvironment()) return;
                probeRangeSupport(src).then((result) => {
                    window.__lastTvRangeProbe = { src, ...result, at: Date.now() };
                    if (result.supported === false) {
                        console.warn('Range request não suportado (status != 206). O streaming pode travar neste host.', result);
                    }
                    // Samsung TV fallback: if status 206 exists, keep streaming even without explicit Accept-Ranges header.
                    stallState.forceStreamWithoutAcceptRanges = result.supported === true;
                    if (result.supported === true && !result.acceptRanges) {
                        console.warn('206 sem Accept-Ranges explícito: mantendo modo forçado de stream para evitar stalled.');
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

        player.addEventListener('error', function() {
            const src = player.currentSrc || player.src || '';
            const mediaError = player.error;
            if (src.includes('/__anv_stream_proxy__')) {
                const code = mediaError && typeof mediaError.code !== 'undefined' ? mediaError.code : 'unknown';
                console.error('TV Proxy playback failed:', {
                    src,
                    mediaErrorCode: code,
                    readyState: player.readyState,
                    networkState: player.networkState
                });
                showVideoError('Falha no proxy de stream (SW). Verifique status 404/500/CORS da URL de origem.');
            }
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
