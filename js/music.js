/* js/music.js - Music rendering grouped by anime with mini-player */
(function() {
    'use strict';
    
    let musicPlayerInstance = null;
    let currentPlayingCard = null;
    let tvAudioRecoveryTimer = null;
    let tvAudioRecoveryAttempts = 0;
    let tvAudioResumeTimer = null;

    function isTvMusicEnvironment() {
        try {
            if (window.__ANIVERSE_FORCE_TV_MODE__ === true) return true;
            if (document.body.classList.contains('tv-mode')) return true;
            if (typeof window.tizen !== 'undefined' || typeof window.webapis !== 'undefined') return true;
            return /tizen|smart-tv|smarttv|hbbtv|web0s|googletv|appletv|viera|aquos/i.test(navigator.userAgent || '');
        } catch (_) {
            return false;
        }
    }

    function addMediaCacheBust(url) {
        try {
            const parsed = new URL(url, window.location.href);
            parsed.searchParams.set('_tv_retry', String(Date.now()));
            return parsed.toString();
        } catch (_) {
            const sep = String(url || '').includes('?') ? '&' : '?';
            return `${url}${sep}_tv_retry=${Date.now()}`;
        }
    }

    function getMusicUrlDiagnostics(url) {
        const input = String(url || '').trim();
        if (!input) {
            return {
                ok: false,
                reason: 'invalid_url',
                userMessage: 'URL da música está vazia ou inválida.'
            };
        }

        let parsed;
        try {
            parsed = new URL(input, window.location.href);
        } catch (_) {
            return {
                ok: false,
                reason: 'invalid_url',
                userMessage: 'URL da música inválida. Verifique o link informado.'
            };
        }

        if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) {
            return {
                ok: false,
                reason: 'unsupported_protocol',
                userMessage: 'Formato de link não suportado para reprodução.'
            };
        }

        const knownNonDirectHosts = [
            'youtube.com',
            'youtu.be',
            'music.youtube.com',
            'open.spotify.com',
            'soundcloud.com',
            'drive.google.com'
        ];
        const lowerHost = parsed.hostname.toLowerCase();
        const lowerPath = parsed.pathname.toLowerCase();
        const directAudioPattern = /\.(mp3|m4a|aac|ogg|wav|flac|opus)(\?|$)/i;
        const likelyHtmlPage = (
            knownNonDirectHosts.some((host) => lowerHost === host || lowerHost.endsWith(`.${host}`)) ||
            (/\/(watch|playlist|album|artist|track|file|view)\b/.test(lowerPath) && !directAudioPattern.test(lowerPath))
        );

        return {
            ok: true,
            url: parsed.toString(),
            isCrossOrigin: parsed.origin !== window.location.origin,
            isLikelyDirectAudio: directAudioPattern.test(`${lowerPath}${parsed.search}`),
            likelyHtmlPage
        };
    }

    function messageForPlaybackFailure(error, diagnostics) {
        const errorName = error?.name || '';
        if (errorName === 'NotAllowedError') {
            return 'Reprodução bloqueada pelo navegador. Toque no player para iniciar a música.';
        }
        if (diagnostics?.reason === 'invalid_url' || diagnostics?.reason === 'unsupported_protocol') {
            return diagnostics.userMessage || 'URL da música inválida.';
        }
        if (diagnostics?.likelyHtmlPage || (!diagnostics?.isLikelyDirectAudio && errorName === 'NotSupportedError')) {
            return 'Esse link não parece ser um arquivo de áudio direto. Use um link direto (.mp3, .m4a, etc).';
        }
        if (errorName === 'NotSupportedError') {
            return 'Não foi possível reproduzir: formato não suportado ou fonte inválida.';
        }
        return 'Erro ao reproduzir. Clique para tentar novamente.';
    }

    function getBufferedAhead(media) {
        try {
            if (!media || !media.buffered || media.buffered.length === 0) return 0;
            const currentTime = Number(media.currentTime) || 0;
            for (let index = 0; index < media.buffered.length; index += 1) {
                const start = media.buffered.start(index);
                const end = media.buffered.end(index);
                if (currentTime >= start && currentTime <= end) {
                    return Math.max(0, end - currentTime);
                }
            }
        } catch (_) {}
        return 0;
    }

    function waitForBufferedAudio(audio, options = {}) {
        if (!audio) return;

        const minimumAhead = Number.isFinite(options.minimumAhead) ? options.minimumAhead : 4;
        const maxWaitMs = Number.isFinite(options.maxWaitMs) ? options.maxWaitMs : 4000;
        const startedAt = Date.now();
        let settled = false;

        const maybeResume = () => {
            if (settled) return;
            const waitedLongEnough = Date.now() - startedAt >= maxWaitMs;
            const hasEnoughBuffer = getBufferedAhead(audio) >= minimumAhead;
            if (!waitedLongEnough && !hasEnoughBuffer && audio.readyState < 3) return;
            settled = true;
            cleanup();
            audio.play().catch(() => {});
        };

        const cleanup = () => {
            audio.removeEventListener('canplay', maybeResume);
            audio.removeEventListener('canplaythrough', maybeResume);
            audio.removeEventListener('progress', maybeResume);
            audio.removeEventListener('loadeddata', maybeResume);
            clearTimeout(fallbackTimer);
        };

        const fallbackTimer = setTimeout(maybeResume, maxWaitMs);
        audio.addEventListener('canplay', maybeResume);
        audio.addEventListener('canplaythrough', maybeResume);
        audio.addEventListener('progress', maybeResume);
        audio.addEventListener('loadeddata', maybeResume);
        maybeResume();
    }

    function setAudioSource(audio, url, options = {}) {
        if (!audio || !url) return;
        const preserveTime = Number.isFinite(options.preserveTime) ? options.preserveTime : 0;
        const nextUrl = options.cacheBust ? addMediaCacheBust(url) : url;
        const analyseCors = options.analyseCors ?? (audio.crossOrigin === 'anonymous');

        audio.pause();
        audio.removeAttribute('src');
        while (audio.firstChild) audio.removeChild(audio.firstChild);
        if (analyseCors) audio.crossOrigin = 'anonymous';
        else audio.removeAttribute('crossorigin');
        audio.src = nextUrl;

        if (preserveTime > 0) {
            audio.addEventListener('loadedmetadata', () => {
                try { audio.currentTime = preserveTime; } catch (_) {}
            }, { once: true });
        }
    }

    function scheduleTvAudioRecovery(audio) {
        if (!isTvMusicEnvironment() || !audio || !currentMusicData?.src) return;
        if (tvAudioRecoveryTimer) return;
        if (audio.paused || audio.ended) return;
        if (getBufferedAhead(audio) >= 2.5) return;

        tvAudioRecoveryTimer = setTimeout(() => {
            tvAudioRecoveryTimer = null;
            if (audio.paused || audio.ended || !currentMusicData?.src) return;
            if (tvAudioRecoveryAttempts >= 4) return;
            tvAudioRecoveryAttempts += 1;
            const resumeTime = Math.max(0, (audio.currentTime || 0) - 0.35);
            const recoverySource = currentMusicData.resolvedSrc || currentMusicData.src;
            setAudioSource(audio, recoverySource, { preserveTime: resumeTime, cacheBust: !String(recoverySource).startsWith('blob:') });
            const waitForPlayable = () => waitForBufferedAudio(audio, { minimumAhead: 4, maxWaitMs: 2400 });
            tvAudioResumeTimer = setTimeout(waitForPlayable, 450);
        }, 2200);
    }

    function clearTvAudioRecovery() {
        if (tvAudioRecoveryTimer) {
            clearTimeout(tvAudioRecoveryTimer);
            tvAudioRecoveryTimer = null;
        }
        if (tvAudioResumeTimer) {
            clearTimeout(tvAudioResumeTimer);
            tvAudioResumeTimer = null;
        }
    }
    
    // Get or create singleton audio element
    function getMusicAudio() {
        if (musicPlayerInstance) return musicPlayerInstance;
        
        // Reuse the music element; achievement and maintenance audio belong to their own features.
        let audio = document.getElementById('music-playing-audio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'music-playing-audio';
            audio.preload = isTvMusicEnvironment() ? 'auto' : 'metadata';
            audio.removeAttribute('crossorigin');
            audio.style.display = 'none';
            document.body.appendChild(audio);
            
            // Restore saved volume
            try {
                const savedVolume = localStorage.getItem('musicVolume');
                const savedMuted = localStorage.getItem('musicMuted');
                if (savedVolume !== null) {
                    audio.volume = parseFloat(savedVolume);
                }
                if (savedMuted !== null) {
                    audio.muted = savedMuted === 'true';
                }
            } catch(e) {
                console.warn('Could not restore music volume:', e);
            }
        }
        
        // Restore saved volume preference
        const savedVolume = localStorage.getItem('musicVolume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            // Validate volume is within range [0, 1]
            if (!isNaN(volume) && volume >= 0 && volume <= 1) {
                audio.volume = volume;
            }
        }
        
        // Restore saved mute preference
        const savedMuted = localStorage.getItem('musicMuted');
        if (savedMuted !== null) {
            audio.muted = savedMuted === 'true';
        }
        
        audio.preload = isTvMusicEnvironment() ? 'auto' : 'metadata';
        audio.setAttribute('preload', audio.preload);

        musicPlayerInstance = audio;
        return audio;
    }
    
    // Create mini-player UI
    function createMiniPlayer() {
        if (document.getElementById('music-mini-player')) return;
        
        const miniPlayer = document.createElement('div');
        miniPlayer.id = 'music-mini-player';
        miniPlayer.className = 'mini-player music-mini-player hidden';
        miniPlayer.innerHTML = `
            <img id="mini-player-thumb" src="" alt="Album art" class="mini-player-thumb">
            <div class="mini-player-info">
                <div id="mini-player-title" class="mini-player-title">Track Title</div>
                <div id="mini-player-artist" class="mini-player-artist">Artist</div>
                <div class="mini-player-time">
                    <span id="music-current-time">0:00</span> / <span id="music-duration">0:00</span>
                    <span id="mini-download-status" class="mini-download-status"></span>
                </div>
            </div>
            <div class="mini-player-controls">
                <button id="mini-play-pause" class="mini-control-btn" aria-label="Play/Pause">
                    <i class="fas fa-pause"></i>
                </button>

                <button id="mini-prev-track" class="mini-control-btn" aria-label="Faixa anterior">
                    <i class="fas fa-step-backward"></i>
                </button>
                <button id="mini-next-track" class="mini-control-btn" aria-label="Próxima faixa">
                    <i class="fas fa-step-forward"></i>
                </button>
                
                <!-- CONTROLE DE VOLUME -->
                <div class="mini-volume-container">
                    <button class="mini-control-btn" id="mini-music-volume-btn" aria-label="Mute/Unmute">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="mini-volume-slider" id="mini-volume-slider">
                        <div class="mini-volume-fill" id="mini-volume-fill"></div>
                    </div>
                </div>
                
                <button id="mini-music-fullscreen" class="mini-control-btn" aria-label="Fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
                <button id="mini-download-track" class="mini-control-btn" aria-label="Baixar música">
                    <i class="fas fa-download"></i>
                </button>
                <button id="mini-close" class="mini-control-btn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mini-player-progress-container" id="music-progress-container">
                <div class="mini-player-progress">
                    <div class="progress-bar-mini" id="music-progress-bar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(miniPlayer);
        function setMiniPlayerHeight() {
            const height = miniPlayer.offsetHeight;
            if (height) document.body.style.setProperty('--mini-player-height', `${height}px`);
        }
        setMiniPlayerHeight();
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(setMiniPlayerHeight).observe(miniPlayer);
        }
        
        const audio = getMusicAudio();
        
        // Event listeners
        document.getElementById('mini-play-pause').addEventListener('click', togglePlayPause);
        document.getElementById('mini-prev-track').addEventListener('click', playPreviousTrack);
        document.getElementById('mini-next-track').addEventListener('click', playNextTrack);
        document.getElementById('mini-close').addEventListener('click', closeMiniPlayer);
        document.getElementById('mini-music-fullscreen').addEventListener('click', openMusicFullscreen);
        miniPlayer.addEventListener('click', (event) => {
            if (!event.defaultPrevented && !event.target.closest('button, input, select, a, [role="slider"], .mini-volume-container, .mini-player-progress-container')) {
                openMusicFullscreen();
            }
        });
        document.getElementById('mini-download-track').addEventListener('click', () => {
            if (typeof window.downloadCurrentMusic === 'function') {
                window.downloadCurrentMusic();
            }
        });
        
        // VOLUME BUTTON
        const volumeBtn = document.getElementById('mini-music-volume-btn');
        volumeBtn.addEventListener('click', () => {
            if (audio) {
                audio.muted = !audio.muted;
                updateMusicVolume();
                // Save mute preference
                localStorage.setItem('musicMuted', audio.muted.toString());
            }
        });
        
        // VOLUME SLIDER
        const volumeSlider = document.getElementById('mini-volume-slider');
        volumeSlider.setAttribute('role', 'slider');
        volumeSlider.setAttribute('aria-label', 'Volume da música');
        volumeSlider.setAttribute('aria-valuemin', '0');
        volumeSlider.setAttribute('aria-valuemax', '100');
        volumeSlider.tabIndex = 0;
        let volumePointer = null;
        const setVolumeFromPointer = (event) => {
            if (!audio) return;
            const rect = volumeSlider.getBoundingClientRect();
            if (rect.width <= 0) return;
            audio.volume = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            audio.muted = false;
            updateMusicVolume();
        };
        volumeSlider.addEventListener('click', (e) => {
            e.stopPropagation();
            setVolumeFromPointer(e);
        });
        volumeSlider.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            event.stopPropagation();
            volumePointer = event.pointerId;
            volumeSlider.setPointerCapture(event.pointerId);
            setVolumeFromPointer(event);
        });
        volumeSlider.addEventListener('pointermove', event => {
            if (volumePointer === event.pointerId) setVolumeFromPointer(event);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => volumeSlider.addEventListener(type, () => { volumePointer = null; }));
        volumeSlider.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault(); event.stopPropagation();
            audio.volume = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : Math.max(0, Math.min(1, audio.volume + (['ArrowUp', 'ArrowRight'].includes(event.key) ? .05 : -.05)));
            audio.muted = false;
            updateMusicVolume();
        });
        
        // BARRA DE PROGRESSO CLICÁVEL
        const progressContainer = document.getElementById('music-progress-container');
        progressContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = Math.max(0, Math.min(1, percent)) * audio.duration;
        });
        
        // Update play/pause icon based on audio state
        audio.addEventListener('play', () => {
            clearTvAudioRecovery();
            tvAudioRecoveryAttempts = 0;
            updatePlayPauseIcon();
        });
        audio.addEventListener('pause', () => {
            clearTvAudioRecovery();
            updatePlayPauseIcon();
        });
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('volumechange', updateMusicVolume);
        audio.addEventListener('canplay', clearTvAudioRecovery);
        audio.addEventListener('canplaythrough', clearTvAudioRecovery);
        audio.addEventListener('playing', clearTvAudioRecovery);
        audio.addEventListener('waiting', () => scheduleTvAudioRecovery(audio));
        audio.addEventListener('stalled', () => scheduleTvAudioRecovery(audio));
        audio.addEventListener('error', () => scheduleTvAudioRecovery(audio));
        audio.addEventListener('ended', () => {
            // Auto-advance to next track
            clearTvAudioRecovery();
            playNextTrack();
        });
        
        // Initialize volume display
        updateMusicVolume();
        setupMediaSessionHandlers();
        updateTrackNavigationButtons();
    }
    
    function updatePlayPauseIcon() {
        const audio = getMusicAudio();
        const icon = document.querySelector('#mini-play-pause i');
        if (icon) {
            icon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        }
    }
    
    function togglePlayPause() {
        const audio = getMusicAudio();
        if (audio.paused) {
            if (isTvMusicEnvironment()) {
                waitForBufferedAudio(audio, { minimumAhead: 3, maxWaitMs: 1800 });
            } else {
                audio.play().catch(err => {
                    console.error('Play failed:', err);
                    showMusicError('Erro ao reproduzir.');
                });
            }
        } else {
            audio.pause();
        }
    }
    
    function updateProgress() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const progressBar = document.getElementById('music-progress-bar');
        const currentTimeEl = document.getElementById('music-current-time');
        
        if (progressBar && audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = percent + '%';
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }
    
    function updateDuration() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const durationEl = document.getElementById('music-duration');
        if (durationEl) {
            durationEl.textContent = formatTime(audio.duration);
        }
    }
    
    // NOVA FUNÇÃO: Atualizar UI de volume
    function updateMusicVolume() {
        const audio = getMusicAudio();
        if (!audio) return;
        
        const volumeFill = document.getElementById('mini-volume-fill');
        const volumeBtn = document.getElementById('mini-music-volume-btn');
        
        if (volumeFill) {
            volumeFill.style.width = (audio.volume * 100) + '%';
        }
        const volumeSlider = document.getElementById('mini-volume-slider');
        if (volumeSlider) {
            volumeSlider.setAttribute('aria-valuenow', String(Math.round(audio.volume * 100)));
            volumeSlider.setAttribute('aria-valuetext', audio.muted ? 'Sem som' : `${Math.round(audio.volume * 100)}%`);
        }
        
        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (icon) {
                if (audio.muted || audio.volume === 0) {
                    icon.className = 'fas fa-volume-mute';
                } else if (audio.volume < 0.5) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
        }
        
        // Persist volume to localStorage
        try {
            localStorage.setItem('musicVolume', audio.volume.toString());
            localStorage.setItem('musicMuted', audio.muted.toString());
        } catch(e) {
            console.warn('Could not save music volume:', e);
        }
    }
    
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    let currentMusicData = null;

    function getAllMusicCards() {
        return Array.from(document.querySelectorAll('.music-card'));
    }

    function getCurrentTrackIndex() {
        if (!currentPlayingCard) return -1;
        return getAllMusicCards().indexOf(currentPlayingCard);
    }

    function updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator) || !currentMusicData) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentMusicData.title || 'AniVerse',
                artist: currentMusicData.artist || 'AniVerse',
                album: currentMusicData.anime || 'AniVerse Music',
                artwork: [{
                    src: normalizeTrackArtwork(currentMusicData.thumbnail),
                    sizes: '512x512',
                    type: 'image/png'
                }]
            });
        } catch (error) {
            console.warn('Media Session metadata error:', error);
        }
    }

    function getTvMusicButtons() {
        return [
            'mini-prev-track',
            'mini-play-pause',
            'mini-next-track',
            'mini-close',
            'music-fs-prev',
            'music-fs-play-pause',
            'music-fs-next',
            'music-fs-close-btn'
        ].map(id => document.getElementById(id)).filter(Boolean);
    }

    function updateTrackNavigationButtons() {
        const index = getCurrentTrackIndex();
        const cards = getAllMusicCards();
        const hasPrevious = index > 0;
        const hasNext = index >= 0 && index < cards.length - 1;

        ['mini-prev-track', 'music-fs-prev'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !hasPrevious;
        });

        ['mini-next-track', 'music-fs-next'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !hasNext;
        });
    }

    function refreshMusicPlayerUI() {
        if (!currentMusicData) return;

        const thumb = normalizeTrackArtwork(currentMusicData.thumbnail);
        const title = currentMusicData.title || 'Sem título';
        const artist = currentMusicData.artist || 'Artista desconhecido';

        const miniThumb = document.getElementById('mini-player-thumb');
        const miniTitle = document.getElementById('mini-player-title');
        const miniArtist = document.getElementById('mini-player-artist');
        if (miniThumb) {
            miniThumb.onerror = () => { miniThumb.src = 'images/bg-default.png'; };
            miniThumb.src = thumb;
        }
        if (miniTitle) miniTitle.textContent = title;
        if (miniArtist) miniArtist.textContent = artist;

        const fsThumb = document.getElementById('music-fs-thumb');
        const fsTitle = document.getElementById('music-fs-title');
        const fsArtist = document.getElementById('music-fs-artist');
        const fsBg = document.getElementById('music-fs-bg');
        if (fsThumb && fsThumb.getAttribute('src') !== thumb) {
            fsThumb.src = thumb;
            fsBg.src = thumb;
        }
        if (fsTitle) fsTitle.textContent = title;
        if (fsArtist) fsArtist.textContent = artist;

        updateTrackNavigationButtons();
        updateMediaSessionMetadata();
    }

    function normalizeTrackArtwork(thumb) {
        const value = String(thumb || '').trim();
        return value || 'images/bg-default.png';
    }

    function setupMediaSessionHandlers() {
        if (!('mediaSession' in navigator)) return;

        const audio = getMusicAudio();
        try {
            navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
            navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
            navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            });
        } catch (error) {
            console.warn('Media Session handlers not fully supported:', error);
        }
    }
    
    let fullscreenPreviousOverflow = '';
    let previewingFullscreenSeek = false;
    let syncFullscreenMotion;
    let musicMotionCatalog;

    function musicControlIcon(name, size = 22) {
        return `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#control-${name}"/></svg>`;
    }

    function setupFullscreenMotion(modal, audio) {
        const artwork = modal.querySelector('.music-fs-artwork');
        let catalog;
        let curve;
        let curveUrl;
        let analysis;
        let frame = 0;
        let lastUpdate = 0;
        let pulse = 0;
        let pointerFrame = 0;
        let pointerEvent;

        function refreshCurve() {
            const url = audio.currentSrc;
            if (curveUrl === url) return;
            curveUrl = url;
            const source = url.includes('_tv_retry=') ? (currentMusicData?.resolvedSrc || url) : url;
            const encoded = catalog?.tracks?.[source];
            curve = encoded ? Uint8Array.from(atob(encoded), character => character.charCodeAt(0)) : null;
        }

        function disconnectAnalysis() {
            if (!analysis) return;
            analysis.stream.getTracks().forEach(track => track.stop());
            analysis.source.disconnect();
            analysis.context.close().catch(() => {});
            analysis = null;
        }

        function connectAnalysis() {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const capture = audio.captureStream || audio.mozCaptureStream;
            if (!AudioContext || !capture || !audio.currentSrc) return;
            const url = new URL(audio.currentSrc);
            if (url.origin !== location.origin && url.protocol !== 'data:' && audio.crossOrigin == null) return;

            let stream;
            let context;
            try {
                // Analyse a copy so there is no change to the audio element's output or network request.
                stream = capture.call(audio);
                const [track] = stream.getAudioTracks();
                if (!track) return;
                context = new AudioContext();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 1024;
                analyser.smoothingTimeConstant = .55;
                source.connect(analyser);
                context.resume().catch(() => {});
                const bassBins = Math.min(analyser.frequencyBinCount, Math.max(2, Math.round(180 * analyser.fftSize / context.sampleRate)));
                analysis = { context, source, analyser, stream, track, bassBins, samples: new Uint8Array(analyser.frequencyBinCount), url: audio.currentSrc };
            } catch (_) {
                stream?.getTracks().forEach(track => track.stop());
                context?.close().catch(() => {});
            }
        }

        function measurePulse() {
            if (analysis?.context.state === 'running' && !analysis.track.muted && analysis.track.readyState === 'live') {
                const { analyser, samples, bassBins } = analysis;
                analyser.getByteFrequencyData(samples);
                let bass = 0;
                for (let i = 1; i < bassBins; i++) bass += samples[i];
                return bass / ((bassBins - 1) * 255);
            }
            if (curve) {
                const position = audio.currentTime * catalog.samplesPerSecond;
                const index = Math.floor(position);
                const current = curve[index] || 0;
                const next = curve[index + 1] || 0;
                return (current + (next - current) * (position - index)) / 255;
            }
            return 0;
        }

        function resetPointer() {
            cancelAnimationFrame(pointerFrame);
            pointerFrame = 0;
            artwork.style.removeProperty('--music-cover-x');
            artwork.style.removeProperty('--music-cover-y');
            artwork.classList.remove('is-pointed');
        }

        artwork.addEventListener('mousemove', event => {
            pointerEvent = event;
            if (pointerFrame) return;
            pointerFrame = requestAnimationFrame(() => {
                pointerFrame = 0;
                const { clientX, clientY } = pointerEvent;
                const rect = artwork.getBoundingClientRect();
                const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
                artwork.classList.add('is-pointed');
                artwork.style.setProperty('--music-cover-x', `${(.5 - y) * 28}deg`);
                artwork.style.setProperty('--music-cover-y', `${(x - .5) * 28}deg`);
                artwork.style.setProperty('--music-shine-x', `${x * 100}%`);
                artwork.style.setProperty('--music-shine-y', `${y * 100}%`);
            });
        }, { passive: true });
        artwork.addEventListener('mouseleave', resetPointer);

        const shouldAnimate = () => modal.classList.contains('visible') && !document.hidden && !audio.paused && !audio.ended;

        function animate(now) {
            frame = 0;
            if (!shouldAnimate() || curveUrl !== audio.currentSrc) {
                sync();
                return;
            }
            if (now - lastUpdate >= 32) {
                lastUpdate = now;
                const strength = measurePulse();
                pulse += (strength - pulse) * (strength > pulse ? .72 : .45);
                modal.style.setProperty('--music-pulse', pulse.toFixed(3));
            }
            frame = requestAnimationFrame(animate);
        }

        function sync() {
            if (!modal.classList.contains('visible') || document.hidden) resetPointer();
            refreshCurve();
            if (analysis && analysis.url !== audio.currentSrc) disconnectAnalysis();
            if (shouldAnimate() && !analysis && audio.readyState >= 2) connectAnalysis();
            if (!shouldAnimate() || (!curve && !analysis)) {
                cancelAnimationFrame(frame);
                frame = 0;
                pulse = 0;
                modal.style.removeProperty('--music-pulse');
                disconnectAnalysis();
                return;
            }
            if (!frame) frame = requestAnimationFrame(animate);
        }

        ['playing', 'pause', 'ended', 'emptied'].forEach(type => audio.addEventListener(type, sync));
        document.addEventListener('visibilitychange', sync);
        if (!musicMotionCatalog) {
            musicMotionCatalog = fetch('music-motion.json?v=1').then(response => {
                if (!response.ok) throw new Error('Análise musical indisponível');
                return response.json();
            }).catch(() => null);
        }
        musicMotionCatalog.then(data => {
            catalog = data;
            curveUrl = undefined;
            sync();
        });
        return sync;
    }

    function openMusicFullscreen() {
        if (!currentMusicData) return;
        
        const audio = getMusicAudio();
        
        // Criar modal fullscreen
        let fullscreenModal = document.getElementById('music-fullscreen-modal');
        
        if (!fullscreenModal) {
            fullscreenModal = document.createElement('div');
            fullscreenModal.id = 'music-fullscreen-modal';
            fullscreenModal.className = 'music-fullscreen-modal';
            fullscreenModal.innerHTML = `
                <div class="music-fullscreen-bg" aria-hidden="true"><img id="music-fs-bg" alt="" decoding="async"></div>
                <button type="button" class="music-fs-close" id="music-fs-close-btn" aria-label="Minimizar player" title="Minimizar player">${musicControlIcon('chevron-down')}</button>
                <div class="music-fullscreen-content">
                    <div class="music-fs-artwork">
                        <div class="music-fs-sleeve"><img alt="Capa do álbum" id="music-fs-thumb" decoding="async"></div>
                    </div>
                    <section class="music-fs-details">
                        <h2 id="music-fs-title"></h2>
                        <p id="music-fs-artist"></p>
                        <div id="music-fs-progress-container">
                            <div class="music-fs-progress-bar">
                                <div class="music-fs-progress-fill" id="music-fs-progress-fill"></div>
                                <input id="music-fs-seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Posição da música">
                            </div>
                            <div class="music-fs-time"><span id="music-fs-current">0:00</span><span id="music-fs-duration">0:00</span></div>
                        </div>
                        <div class="music-fs-controls">
                            <div class="music-fs-transport">
                                <button type="button" class="music-fs-control-btn" id="music-fs-prev" aria-label="Faixa anterior" title="Faixa anterior">${musicControlIcon('prev-track')}</button>
                                <button type="button" class="music-fs-control-btn primary" id="music-fs-play-pause" aria-label="Reproduzir">${musicControlIcon('play', 28)}</button>
                                <button type="button" class="music-fs-control-btn" id="music-fs-next" aria-label="Próxima faixa" title="Próxima faixa">${musicControlIcon('next-track')}</button>
                            </div>
                            <button type="button" class="music-fs-control-btn" id="music-fs-download" aria-label="Baixar música" title="Baixar música">${musicControlIcon('download', 19)}</button>
                        </div>
                    </section>
                </div>`;
            document.body.appendChild(fullscreenModal);
            fullscreenModal.setAttribute('role', 'dialog');
            fullscreenModal.setAttribute('aria-labelledby', 'music-fs-title');
            fullscreenModal.setAttribute('aria-hidden', 'true');
            fullscreenModal.inert = true;
            syncFullscreenMotion = setupFullscreenMotion(fullscreenModal, audio);

            const artwork = fullscreenModal.querySelector('#music-fs-thumb');
            artwork.addEventListener('error', () => {
                if (artwork.getAttribute('src') === 'images/bg-default.png') return;
                artwork.src = 'images/bg-default.png';
                fullscreenModal.querySelector('#music-fs-bg').src = 'images/bg-default.png';
            });
            artwork.addEventListener('load', () => {
                if (fullscreenModal.classList.contains('visible')) {
                    artwork.animate?.([{ opacity: .35 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
                }
            });
            
            // Event listeners
            document.getElementById('music-fs-close-btn').addEventListener('click', closeMusicFullscreen);
            fullscreenModal.addEventListener('click', event => {
                if (event.target === fullscreenModal) closeMusicFullscreen();
            });
            fullscreenModal.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeMusicFullscreen();
                }
            });
            document.getElementById('music-fs-play-pause').addEventListener('click', togglePlayPause);
            document.getElementById('music-fs-prev').addEventListener('click', playPreviousTrack);
            document.getElementById('music-fs-next').addEventListener('click', playNextTrack);
            document.getElementById('music-fs-download').addEventListener('click', () => {
                if (typeof window.downloadCurrentMusic === 'function') {
                    window.downloadCurrentMusic();
                }
            });
            
            const seekBar = document.getElementById('music-fs-seek');
            seekBar.addEventListener('input', () => {
                if (seekBar.disabled) return;
                previewingFullscreenSeek = true;
                const percent = seekBar.valueAsNumber;
                renderFullscreenProgress(percent, percent * audio.duration / 100, audio.duration);
            });
            seekBar.addEventListener('change', () => {
                if (!seekBar.disabled) audio.currentTime = seekBar.valueAsNumber * audio.duration / 100;
                previewingFullscreenSeek = false;
                updateFullscreenProgress();
            });
            seekBar.addEventListener('pointercancel', () => {
                previewingFullscreenSeek = false;
                updateFullscreenProgress();
            });
            seekBar.addEventListener('keydown', event => {
                if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
                event.preventDefault();
                audio.currentTime = event.key === 'Home' ? 0 : event.key === 'End' ? audio.duration : Math.max(0, Math.min(audio.duration, audio.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
            });
            
            if (audio) {
                ['timeupdate', 'durationchange', 'seeked', 'emptied'].forEach(event => audio.addEventListener(event, updateFullscreenProgress));
                audio.addEventListener('play', updateFullscreenPlayPauseIcon);
                audio.addEventListener('pause', updateFullscreenPlayPauseIcon);
            }
        }
        
        // Atualizar conteúdo
        refreshMusicPlayerUI();
        
        // Atualizar botão play/pause
        updateFullscreenPlayPauseIcon();
        
        if (!fullscreenModal.classList.contains('visible')) fullscreenPreviousOverflow = document.body.style.overflow;
        fullscreenModal.classList.add('visible');
        fullscreenModal.setAttribute('aria-modal', 'true');
        fullscreenModal.setAttribute('aria-hidden', 'false');
        fullscreenModal.inert = false;
        document.body.style.overflow = 'hidden';
        syncFullscreenMotion();
        updateFullscreenProgress();
        document.getElementById('music-fs-close-btn')?.focus();
    }
    
    function closeMusicFullscreen(restoreFocus = true) {
        const fullscreenModal = document.getElementById('music-fullscreen-modal');
        if (!fullscreenModal?.classList.contains('visible')) return;
        previewingFullscreenSeek = false;
        fullscreenModal.classList.remove('visible');
        syncFullscreenMotion();
        fullscreenModal.removeAttribute('aria-modal');
        fullscreenModal.inert = true;
        fullscreenModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = fullscreenPreviousOverflow;
        if (restoreFocus) {
            document.getElementById('mini-music-fullscreen')?.focus({ preventScroll: true });
        }
    }
    
    function updateFullscreenProgress() {
        if (previewingFullscreenSeek || !document.getElementById('music-fullscreen-modal')?.classList.contains('visible')) return;
        const audio = getMusicAudio();
        const seekBar = document.getElementById('music-fs-seek');
        const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
        const percent = hasDuration ? (audio.currentTime / audio.duration) * 100 : 0;
        seekBar.disabled = !hasDuration;
        seekBar.value = percent;
        renderFullscreenProgress(percent, audio.currentTime, audio.duration);
    }

    function renderFullscreenProgress(percent, time, duration) {
        const timestamp = formatTime(time);
        document.getElementById('music-fs-progress-fill').style.width = `${percent}%`;
        document.getElementById('music-fs-bg').style.setProperty('--music-backdrop-offset', `${-.65 * percent}dvh`);
        document.getElementById('music-fs-current').textContent = timestamp;
        document.getElementById('music-fs-duration').textContent = formatTime(duration);
        document.getElementById('music-fs-seek').setAttribute('aria-valuetext', timestamp);
    }
    
    function updateFullscreenPlayPauseIcon() {
        const button = document.getElementById('music-fs-play-pause');
        if (!button) return;
        const playing = !getMusicAudio().paused;
        const label = playing ? 'Pausar' : 'Reproduzir';
        button.querySelector('use').setAttribute('href', playing ? '#control-pause' : '#control-play');
        button.setAttribute('aria-label', label);
        button.title = label;
    }
    
    // Play next track in the music list
    function playNextTrack() {
        if (!currentPlayingCard) {
            closeMiniPlayer();
            return;
        }
        
        // Find all music cards
        const cardsArray = getAllMusicCards();
        const currentIndex = cardsArray.indexOf(currentPlayingCard);
        
        if (currentIndex === -1 || currentIndex >= cardsArray.length - 1) {
            // Last track or not found, stop playing
            closeMiniPlayer();
            console.log('🎵 Playlist ended');
            return;
        }
        
        // Get next card and play it
        const nextCard = cardsArray[currentIndex + 1];
        if (nextCard) {
            const src = nextCard.dataset.src;
            const title = nextCard.dataset.title;
            const artist = nextCard.dataset.artist;
            const thumb = nextCard.dataset.thumb;
            
            console.log(`⏭️ Auto-playing next track: ${title}`);
            playMusic(src, title, artist, thumb, nextCard);
        } else {
            closeMiniPlayer();
        }
    }

    function playPreviousTrack() {
        if (!currentPlayingCard) {
            return;
        }

        const cardsArray = getAllMusicCards();
        const currentIndex = cardsArray.indexOf(currentPlayingCard);

        if (currentIndex <= 0) {
            return;
        }

        const previousCard = cardsArray[currentIndex - 1];
        if (previousCard) {
            playMusic(
                previousCard.dataset.src,
                previousCard.dataset.title,
                previousCard.dataset.artist,
                previousCard.dataset.thumb,
                previousCard
            );
        }
    }
    
    function closeMiniPlayer() {
        const audio = getMusicAudio();
        clearTvAudioRecovery();
        tvAudioRecoveryAttempts = 0;
        audio.pause();
        audio.removeAttribute('src');
        while (audio.firstChild) audio.removeChild(audio.firstChild);
        audio.load();
        currentMusicData = null;
        document.getElementById('music-error-container')?.remove();
        
        const miniPlayer = document.getElementById('music-mini-player');
        if (miniPlayer) {
            miniPlayer.classList.add('hidden');
        }
        
        if (currentPlayingCard) {
            currentPlayingCard.classList.remove('playing');
            currentPlayingCard = null;
        }

        closeMusicFullscreen(false);
    }
    
    async function playMusic(src, title, artist, thumb, card) {
        createMiniPlayer();
        
        const miniPlayer = document.getElementById('music-mini-player');
        const audio = getMusicAudio();
        
        // Store current music data for fullscreen
        currentMusicData = {
            src: src,
            resolvedSrc: null,
            title: title,
            artist: artist,
            thumbnail: normalizeTrackArtwork(thumb || card?.querySelector('.music-cover img')?.currentSrc || card?.querySelector('.music-cover img')?.src),
            anime: card?.closest('.music-section')?.querySelector('.music-anime-title')?.textContent || ''
        };
        
        // Stop if clicking same track
        if (currentPlayingCard === card && !audio.paused) {
            closeMiniPlayer();
            return;
        }
        
        // Update previous card
        if (currentPlayingCard && currentPlayingCard !== card) {
            currentPlayingCard.classList.remove('playing');
        }
        currentPlayingCard = card || null;
        
        // Set new track
        clearTvAudioRecovery();
        tvAudioRecoveryAttempts = 0;
        refreshMusicPlayerUI();
        miniPlayer.classList.remove('hidden');

        const diagnostics = getMusicUrlDiagnostics(src);
        if (!currentMusicData || currentMusicData.src !== src) return;
        if (!diagnostics.ok) {
            showMusicError(diagnostics.userMessage || 'URL da música inválida.');
            return;
        }
        if (diagnostics.likelyHtmlPage) {
            showMusicError('Aviso: link pode não ser áudio direto. Tentando reproduzir...');
        }

        const resolvedSrc = diagnostics.url;
        if (!currentMusicData || currentMusicData.src !== src) return;
        currentMusicData.resolvedSrc = resolvedSrc;
        const analyseCors = new URL(resolvedSrc).hostname === 'files.catbox.moe' &&
            Boolean((window.AudioContext || window.webkitAudioContext) && (audio.captureStream || audio.mozCaptureStream));
        setAudioSource(audio, resolvedSrc, { analyseCors });
        
        // Timeout for loading
        const loadTimeout = setTimeout(() => {
            if (!currentMusicData || currentMusicData.src !== src) return;
            if (audio.readyState < 2 && audio.paused) {
                showMusicError('Tempo de carregamento excedido. Tente novamente.');
            }
        }, isTvMusicEnvironment() ? 30000 : 15000);
        
        // Clear timeout on various success events
        const clearLoadTimeout = () => {
            clearTimeout(loadTimeout);
        };

        const onPlaybackError = () => {
            if (!currentMusicData || currentMusicData.src !== src || !audio.getAttribute('src')) return;
            const mediaError = audio.error;
            if (audio.crossOrigin && [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, MediaError.MEDIA_ERR_NETWORK].includes(mediaError?.code)) {
                setAudioSource(audio, resolvedSrc, { analyseCors: false, preserveTime: audio.currentTime });
                audio.addEventListener('error', onPlaybackError, { once: true });
                requestPlayback();
                return;
            }
            clearLoadTimeout();
            let playbackError = null;
            if (mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                playbackError = { name: 'NotSupportedError' };
            } else if (mediaError?.code === MediaError.MEDIA_ERR_NETWORK) {
                playbackError = { name: 'NetworkError' };
            }
            showMusicError(messageForPlaybackFailure(playbackError, diagnostics));
        };
        
        audio.addEventListener('loadeddata', clearLoadTimeout, { once: true });
        audio.addEventListener('playing', clearLoadTimeout, { once: true });
        audio.addEventListener('canplay', clearLoadTimeout, { once: true });
        audio.addEventListener('error', onPlaybackError, { once: true });

        function requestPlayback() {
            const attemptedCors = audio.crossOrigin;
            audio.play().catch(err => {
                if (!currentMusicData || currentMusicData.src !== src || err.name === 'AbortError' ||
                    attemptedCors !== audio.crossOrigin || audio.error) return;
                clearTimeout(loadTimeout);
                console.error('Play failed:', err);
                showMusicError(messageForPlaybackFailure(err, diagnostics));
            });
        }

        let playbackStarted = false;
        const startPlayback = () => {
            if (playbackStarted || !currentMusicData || currentMusicData.src !== src) return;
            playbackStarted = true;
            requestPlayback();
        };

        if (isTvMusicEnvironment()) {
            waitForBufferedAudio(audio, { minimumAhead: 4, maxWaitMs: 2000 });
            audio.addEventListener('canplay', startPlayback, { once: true });
            setTimeout(startPlayback, 2000);
        } else {
            startPlayback();
        }
        
        // Update mini-player/fullscreen/system UI
        // Update current playing card
        if (card) {
            card.classList.add('playing');
        }

        updateTrackNavigationButtons();

        if (isTvMusicEnvironment()) {
            setTimeout(() => {
                if (typeof window.__focusTvMusicPlayer === 'function') {
                    window.__focusTvMusicPlayer();
                } else {
                    const tvPlayButton = document.getElementById('mini-play-pause');
                    if (tvPlayButton && typeof window.__focusTvElement === 'function') {
                        window.__focusTvElement(tvPlayButton);
                    }
                }
            }, 120);
        }
    }
    
    function showMusicError(msg) {
        let el = document.getElementById('music-error-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'music-error-container';
            Object.assign(el.style, {
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                zIndex: '100000',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                textAlign: 'center',
                maxWidth: '80%'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        setTimeout(() => {
            if (el) el.remove();
        }, 5000);
    }
    
    // Render music grid grouped by anime
    function renderMusicGrid() {
        const musicGrid = document.getElementById('music-grid');
        if (!musicGrid) {
            console.warn('music.js: #music-grid not found');
            return;
        }
        
        if (!window.animeDB || !window.animeDB.musicLibrary) {
            // Dados ainda não carregados - aguardar evento animeDataLoaded
            // Não mostrar warning aqui pois pode ser timing normal
            return;
        }
        
        const musicLibrary = window.animeDB.musicLibrary;
        musicGrid.innerHTML = '';
        
        // Group themes by anime
        const grouped = {};
        (musicLibrary.themes || []).forEach(theme => {
            const animeName = theme.anime || 'Outros';
            if (!grouped[animeName]) {
                grouped[animeName] = [];
            }
            grouped[animeName].push(theme);
        });

        Object.values(grouped).forEach((tracks) => {
            tracks.sort((a, b) => {
                const weight = (track) => {
                    const type = String(track?.type || '').toLowerCase();
                    if (type === 'opening') return 0;
                    if (type === 'ending') return 1;
                    return 2;
                };
                return weight(a) - weight(b);
            });
        });
        
        // Render each anime section preserving insertion order
        Object.entries(grouped).forEach(([animeTitle, tracks]) => {
            const section = document.createElement('div');
            section.className = 'music-section';
            
            const header = document.createElement('h2');
            header.className = 'music-anime-title';
            header.textContent = `${animeTitle} (${tracks.length} ${tracks.length === 1 ? 'música' : 'músicas'})`;
            section.appendChild(header);
            
            const tracksContainer = document.createElement('div');
            tracksContainer.className = 'music-tracks';
            
            tracks.forEach(track => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.src = track.audio;
                card.dataset.title = track.title;
                card.dataset.artist = track.artist || animeTitle;
                card.dataset.thumb = track.cover || 'images/bg-default.png';
                
                card.innerHTML = `
                    <div class="music-cover">
                        <img src="${track.cover || 'images/bg-default.png'}" alt="${track.title}" loading="lazy" decoding="async">
                        <div class="music-play-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="music-info">
                        <div class="music-title">${track.title}</div>
                        <div class="music-artist">${track.artist || animeTitle}</div>
                        <div class="music-type">${track.type === 'opening' ? 'Opening' : 'Ending'}</div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    playMusic(
                        card.dataset.src,
                        card.dataset.title,
                        card.dataset.artist,
                        card.dataset.thumb,
                        card
                    );
                });
                
                tracksContainer.appendChild(card);
            });
            
            section.appendChild(tracksContainer);
            musicGrid.appendChild(section);
        });
        
        // Add fallback if no music
        if (Object.keys(grouped).length === 0) {
            ensureFallbackMessage(musicGrid, 'música');
        }
        
        console.log('Music grid rendered with', Object.keys(grouped).length, 'anime sections');
    }
    
    function ensureFallbackMessage(container, type) {
        if (!container) return;
        
        const existingCards = container.querySelectorAll('.music-card, .music-section');
        if (existingCards.length === 0) {
            const fallback = document.createElement('div');
            fallback.className = 'fallback-card';
            fallback.style.cssText = `
                text-align: center;
                padding: 60px 20px;
                color: var(--text-color);
                font-size: 1.2rem;
            `;
            fallback.innerHTML = `
                <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>Nenhuma ${type} disponível no momento.</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Tente recarregar a página ou adicionar conteúdo.</p>
            `;
            container.appendChild(fallback);
        }
    }
    
    function renderVisibleMusicGrid() {
        if (document.getElementById('openings-section')?.classList.contains('active')) {
            renderMusicGrid();
        }
    }

    // Navigation renders the library on demand; refresh it if already open.
    window.addEventListener('animeDataLoaded', renderVisibleMusicGrid);
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderVisibleMusicGrid, { once: true });
    } else {
        renderVisibleMusicGrid();
    }
    
    function handleTvMediaCommand(command) {
        const audio = document.getElementById('music-playing-audio');
        const miniPlayer = document.getElementById('music-mini-player');
        const videoModal = document.getElementById('video-modal');
        const videoOpen = videoModal && videoModal.style.display === 'flex';
        const musicVisible = miniPlayer && !miniPlayer.classList.contains('hidden') && !miniPlayer.classList.contains('hidden-during-video');

        if (videoOpen) {
            const nativeVideoControls = window.getNativeTvVideoControls && window.getNativeTvVideoControls();
            if (nativeVideoControls?.isActive?.()) {
                if (command === 'media_play_pause') return nativeVideoControls.toggle();
                if (command === 'media_play') return nativeVideoControls.play();
                if (command === 'media_pause') return nativeVideoControls.pause();
                if (command === 'media_next') {
                    document.getElementById('next-episode-btn')?.click();
                    return true;
                }
                return false;
            }

            const video = document.getElementById('anime-player');
            if (!video) return false;
            if (command === 'media_play_pause') {
                if (video.paused) video.play().catch(() => {});
                else video.pause();
                return true;
            }
            if (command === 'media_play') {
                video.play().catch(() => {});
                return true;
            }
            if (command === 'media_pause') {
                video.pause();
                return true;
            }
            if (command === 'media_next') {
                document.getElementById('next-episode-btn')?.click();
                return true;
            }
            return false;
        }

        if (!audio || !musicVisible) return false;

        if (command === 'media_play_pause') {
            togglePlayPause();
        } else if (command === 'media_play') {
            audio.play().catch(() => {});
        } else if (command === 'media_pause') {
            audio.pause();
        } else if (command === 'media_next') {
            playNextTrack();
        } else if (command === 'media_previous') {
            playPreviousTrack();
        } else {
            return false;
        }

        if (typeof window.__focusTvMusicPlayer === 'function') {
            setTimeout(() => window.__focusTvMusicPlayer(), 0);
        }
        return true;
    }

    // Export functions
    window.renderMusicGrid = renderMusicGrid;
    window.playMusic = playMusic;
    window.updateMusicVolume = updateMusicVolume;
    window.__handleTvMediaCommand = handleTvMediaCommand;
})();

// Keyboard shortcuts for music player
document.addEventListener('keydown', (e) => {
    // PRIORIDADE 2: Se modal de vídeo está aberto, IGNORAR comandos de música
    const videoModal = document.getElementById('video-modal');
    if (videoModal && videoModal.style.display === 'flex') {
        return; // Não processar nada se vídeo estiver aberto
    }
    
    // Só processar se mini-player de música estiver visível
    const miniPlayer = document.getElementById('music-mini-player');
    if (!miniPlayer || miniPlayer.classList.contains('hidden')) {
        return;
    }
    
    const audio = document.getElementById('music-playing-audio');
    if (!audio) return;
    
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Prevenir ações padrão
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'm'].includes(e.key)) {
        e.preventDefault();
    }
    
    switch(e.key) {
        case ' ':
            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
            break;
            
        case 'ArrowLeft':
            audio.currentTime = Math.max(0, audio.currentTime - 5);
            break;
            
        case 'ArrowRight':
            audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
            break;
            
        case 'ArrowUp':
            audio.volume = Math.min(1, audio.volume + 0.1);
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
            
        case 'ArrowDown':
            audio.volume = Math.max(0, audio.volume - 0.1);
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
            
        case 'm':
            audio.muted = !audio.muted;
            if (window.updateMusicVolume) {
                window.updateMusicVolume();
            }
            break;
    }
});
