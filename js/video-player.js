/* js/video-player.js - robust player: click-to-pause, skip-controller, PiP fallback, container fullscreen */
(function(){
  function safe(id){ return document.getElementById(id); }
  function showVideoError(msg){ let el=document.getElementById('video-error-container'); if(!el){ el=document.createElement('div'); el.id='video-error-container'; Object.assign(el.style,{position:'absolute',left:'50%',bottom:'14%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.78)',color:'#fff',padding:'10px 14px',borderRadius:'10px',zIndex:1001,pointerEvents:'none',maxWidth:'min(88%, 460px)',textAlign:'center'}); (document.getElementById('video-player-container')||document.body).appendChild(el);} el.textContent=msg; }
  function clearVideoError(){ const el=document.getElementById('video-error-container'); if(el) el.remove(); }

  function SkipController(player, skipId, labelPrefix){
    this.player = player; this.skipBtn = safe(skipId); this.segment = null; this.labelPrefix = labelPrefix || 'Pular';
    if(!this.player || !this.skipBtn){ console.warn('SkipController: missing elements'); return; }
    this.player.addEventListener('timeupdate', ()=> this.update());
    this.skipBtn.addEventListener('click', ()=> { if (this.segment) this.player.currentTime = this.segment.end; });
  }
  SkipController.prototype.setSegment = function(segment){ this.segment = segment; this.update(); };
  SkipController.prototype.update = function(){
    if(!this.player || !this.skipBtn) return;
    if(!this.segment){ this.skipBtn.style.display='none'; return; }
    const t = this.player.currentTime || 0; const show = (t >= this.segment.start && t < this.segment.end);
    this.skipBtn.style.display = show ? 'block' : 'none';
    if(show) this.skipBtn.textContent = `⏩ ${this.labelPrefix} (${Math.ceil(Math.max(0,this.segment.end - t))}s)`;
  };

  function clearCustomMiniPlayer(){
    const mini = document.getElementById('mini-player');
    const placeholder = document.getElementById('anime-player-placeholder');
    const player = document.getElementById('anime-player');
    const container = document.getElementById('video-player-container');
    if (mini && player && container && placeholder && mini.contains(player)) {
      container.appendChild(player);
    }
    try { mini?.remove(); } catch(e) {}
    try { placeholder?.remove(); } catch(e) {}
  }

  function isCompactMobileViewport(){
    try {
      return window.matchMedia('(max-width: 768px)').matches || (window.innerWidth || 0) <= 768;
    } catch (_) {
      return (window.innerWidth || 0) <= 768;
    }
  }

  function showCustomMiniPlayer(player){
    if(!player) return;
    if (isCompactMobileViewport()) return;
    let mini = document.getElementById('mini-player');
    if(!mini){ 
      mini = document.createElement('div'); 
      mini.id='mini-player'; 
      Object.assign(mini.style,{position:'fixed',right:'12px',bottom:'12px',width:'320px',height:'180px',zIndex:100000,background:'#000',borderRadius:'8px',overflow:'hidden'}); 
      document.body.appendChild(mini); 
    }
    let placeholder = document.getElementById('anime-player-placeholder');
    if(!placeholder){ 
      placeholder = document.createElement('div'); 
      placeholder.id='anime-player-placeholder'; 
      placeholder.style.display='none'; 
      const cont=document.getElementById('video-player-container'); 
      if(cont) cont.appendChild(placeholder); 
    }
    mini.appendChild(player);
    player.style.width='100%'; 
    player.style.height='100%'; 
    player.playsInline = true;
    
    // Add close button
    if(!mini.querySelector('.mini-close')){ 
      const c=document.createElement('button'); 
      c.className='mini-close'; 
      c.textContent='✕'; 
      Object.assign(c.style,{position:'absolute',top:'6px',right:'6px',zIndex:10,background:'rgba(0,0,0,0.7)',color:'white',border:'none',borderRadius:'4px',width:'30px',height:'30px',cursor:'pointer'}); 
      mini.appendChild(c); 
      c.addEventListener('click', ()=>{ 
        const container=document.getElementById('video-player-container'); 
        if(container && placeholder) container.appendChild(player); 
        try{ mini.remove(); }catch(e){} 
      }); 
    }
    
    // Add skip button clone to mini-player
    const skipBtn = document.getElementById('skip-opening-btn');
    if(skipBtn && !mini.querySelector('#mini-skip-btn')) {
      const miniSkip = skipBtn.cloneNode(true);
      miniSkip.id = 'mini-skip-btn';
      Object.assign(miniSkip.style,{
        position:'absolute',
        bottom:'10px',
        right:'10px',
        zIndex:15,
        display:'none',
        padding:'6px 12px',
        fontSize:'12px'
      });
      
      // Clone the click event
      miniSkip.addEventListener('click', () => {
        const active = window.getActiveSkipSegment && window.getActiveSkipSegment();
        if(active && Number.isFinite(active.end)) {
          player.currentTime = active.end;
        }
      });
      
      mini.appendChild(miniSkip);
      
      // Sync skip button visibility with main player
      player.addEventListener('timeupdate', () => {
        if(skipBtn.style.display === 'block' || window.getComputedStyle(skipBtn).display === 'block') {
          miniSkip.style.display = 'block';
          miniSkip.textContent = skipBtn.textContent;
        } else {
          miniSkip.style.display = 'none';
        }
      });
    }
  }

  async function toggleFullscreen(){
    const container = document.getElementById('video-player-container');
    const player = document.getElementById('anime-player');
    if(!container || !player) return;
    
    try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
            // Entrar em fullscreen
            if (container.requestFullscreen) {
                await container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                await container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                await container.mozRequestFullScreen();
            } else if (container.msRequestFullscreen) {
                await container.msRequestFullscreen();
            }
            
            container.classList.add('is-fullscreen');
        } else {
            // Sair do fullscreen
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
            
            container.classList.remove('is-fullscreen');
        }
    } catch(err) {
        console.warn('Fullscreen error:', err);
        
        // Fallback manual
        container.classList.toggle('is-fullscreen');
        
        if (container.classList.contains('is-fullscreen')) {
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.zIndex = '9999';
        } else {
            container.style.position = '';
            container.style.top = '';
            container.style.left = '';
            container.style.width = '';
            container.style.height = '';
            container.style.zIndex = '';
        }
    }
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function debounce(fn, waitMs){
    let timeoutId = null;
    return function debounced(...args){
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), waitMs);
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const player = safe('anime-player'); if(!player){ console.warn('#anime-player not found'); return; }
    let lastPersistedSecond = -1;
    let lastPersistedProgressBucket = -1;
    let lastPersistedAt = 0;
    const MIN_CHECKPOINT_SECONDS = 3;
    const PROGRESS_BUCKET_SIZE = 2;

    const persistContinueWatchingNow = (force = false) => {
      if (!window.currentWatchingAnime || !window.profileManager || !window.profileManager.getActiveProfile) return;
      if (!player.duration || Number.isNaN(player.duration) || player.duration <= 0) return;

      const activeProfile = window.profileManager.getActiveProfile();
      if (!activeProfile) return;

      const currentSecond = Math.floor(player.currentTime || 0);
      const progress = Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100));
      const progressBucket = Math.floor(progress / PROGRESS_BUCKET_SIZE);
      const now = Date.now();
      const checkpointReached = Math.abs(currentSecond - lastPersistedSecond) >= MIN_CHECKPOINT_SECONDS || progressBucket !== lastPersistedProgressBucket;

      if (!force && !checkpointReached && now - lastPersistedAt < 1200) return;

      window.profileManager.updateContinueWatching(activeProfile.id, {
        animeId: window.currentWatchingAnime.id,
        title: window.currentWatchingAnime.title,
        thumbnail: window.currentWatchingAnime.thumbnail,
        season: window.currentWatchingAnime.season,
        episode: window.currentWatchingAnime.episode,
        progress: progress,
        currentTime: player.currentTime,
        timestamp: now
      });

      lastPersistedSecond = currentSecond;
      lastPersistedProgressBucket = progressBucket;
      lastPersistedAt = now;
    };
    const persistContinueWatchingDebounced = debounce(() => persistContinueWatchingNow(false), 800);
    
    // Custom controls
    const playPauseBtn = safe('play-pause-btn');
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineProgress = safe('timeline-progress');
    const timeDisplay = safe('time-display');
    const volumeBtn = safe('volume-btn');
    const volumeContainer = document.querySelector('.volume-container');
    const volumeProgress = safe('volume-progress');
    
    // Play/Pause button
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (player.paused) {
          player.play().catch(()=>{});
        } else {
          player.pause();
        }
      });
    }
    
    // Update play/pause icon
    player.addEventListener('play', () => {
      if (playPauseBtn) {
        const icon = playPauseBtn.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-pause';
        }
      }
    });
    
    player.addEventListener('pause', () => {
      if (playPauseBtn) {
        const icon = playPauseBtn.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-play';
        }
      }
    });
    
    // Timeline update
    player.addEventListener('timeupdate', () => {
      if (timelineProgress && player.duration) {
        const percent = (player.currentTime / player.duration) * 100;
        timelineProgress.style.width = percent + '%';
      }
      if (timeDisplay) {
        timeDisplay.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
      }
      persistContinueWatchingDebounced();
    });
    
    // Timeline click and drag (YouTube-style)
    if (timelineContainer) {
      let isDraggingTimeline = false;
      let isScrubbingTimeline = false;
      let wasPlayingBeforeDrag = false;
      let dragSource = null; // 'pointer' | 'mouse' | 'touch'
      let activePointerId = null;
      let dragStartX = 0;
      const DRAG_THRESHOLD_PX = 6;

      function seekToPosition(clientX) {
        const rect = timelineContainer.getBoundingClientRect();
        if (!rect.width || !player.duration || Number.isNaN(player.duration)) return;

        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        player.currentTime = percent * player.duration;
        if (timelineProgress) {
          timelineProgress.style.width = (percent * 100) + '%';
        }
      }

      function beginTimelineDrag(clientX, source, pointerId = null) {
        isDraggingTimeline = true;
        isScrubbingTimeline = false;
        dragSource = source;
        activePointerId = pointerId;
        dragStartX = clientX;
        wasPlayingBeforeDrag = !player.paused;
        seekToPosition(clientX);
      }

      function updateTimelineDrag(clientX, source, pointerId = null) {
        if (!isDraggingTimeline || dragSource !== source) return;
        if (source === 'pointer' && activePointerId !== null && pointerId !== activePointerId) return;

        if (!isScrubbingTimeline && Math.abs(clientX - dragStartX) >= DRAG_THRESHOLD_PX) {
          isScrubbingTimeline = true;
          if (wasPlayingBeforeDrag) player.pause();
        }

        seekToPosition(clientX);
      }

      function endTimelineDrag(source, pointerId = null) {
        if (!isDraggingTimeline || dragSource !== source) return;
        if (source === 'pointer' && activePointerId !== null && pointerId !== activePointerId) return;

        const shouldResume = wasPlayingBeforeDrag && isScrubbingTimeline;
        isDraggingTimeline = false;
        isScrubbingTimeline = false;
        dragSource = null;
        activePointerId = null;
        if (shouldResume) player.play().catch(() => {});
      }

      // Pointer-first support (handles most mobile/desktop browsers)
      timelineContainer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        beginTimelineDrag(e.clientX, 'pointer', e.pointerId);
        if (timelineContainer.setPointerCapture) {
          try { timelineContainer.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      timelineContainer.addEventListener('pointermove', (e) => {
        if (!isDraggingTimeline) return;
        e.preventDefault();
        updateTimelineDrag(e.clientX, 'pointer', e.pointerId);
      });

      document.addEventListener('pointermove', (e) => {
        if (!isDraggingTimeline || dragSource !== 'pointer') return;
        updateTimelineDrag(e.clientX, 'pointer', e.pointerId);
      });

      timelineContainer.addEventListener('pointerup', (e) => {
        if (timelineContainer.releasePointerCapture) {
          try { timelineContainer.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        endTimelineDrag('pointer', e.pointerId);
      });

      document.addEventListener('pointerup', (e) => {
        endTimelineDrag('pointer', e.pointerId);
      });

      timelineContainer.addEventListener('pointercancel', (e) => {
        endTimelineDrag('pointer', e.pointerId);
      });

      timelineContainer.addEventListener('lostpointercapture', () => {
        endTimelineDrag('pointer');
      });

      // Mouse fallback
      timelineContainer.addEventListener('mousedown', (e) => {
        if (isDraggingTimeline) return;
        e.preventDefault();
        e.stopPropagation();
        beginTimelineDrag(e.clientX, 'mouse');
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDraggingTimeline) return;
        updateTimelineDrag(e.clientX, 'mouse');
      });

      document.addEventListener('mouseup', () => {
        endTimelineDrag('mouse');
      });

      // Touch fallback
      timelineContainer.addEventListener('touchstart', (e) => {
        if (isDraggingTimeline || !e.touches.length) return;
        const touch = e.touches[0];
        e.preventDefault();
        e.stopPropagation();
        beginTimelineDrag(touch.clientX, 'touch');
      }, { passive: false });

      document.addEventListener('touchmove', (e) => {
        if (!isDraggingTimeline || dragSource !== 'touch' || !e.touches.length) return;
        e.preventDefault();
        updateTimelineDrag(e.touches[0].clientX, 'touch');
      }, { passive: false });

      document.addEventListener('touchend', () => {
        endTimelineDrag('touch');
      });

      document.addEventListener('touchcancel', () => {
        endTimelineDrag('touch');
      });

      // Quick seek on click/tap
      timelineContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDraggingTimeline || isScrubbingTimeline) return;
        seekToPosition(e.clientX);
      });
    }

    // Volume button
    if (volumeBtn) {
      volumeBtn.addEventListener('click', () => {
        player.muted = !player.muted;
        updateVolumeIcon();
        if (volumeProgress) {
          volumeProgress.style.width = player.muted ? '0%' : (player.volume * 100) + '%';
        }
        // Save video mute preference
        localStorage.setItem('videoMuted', player.muted.toString());
      });
    }
    
    function updateVolumeIcon() {
      if (!volumeBtn) return;
      const icon = volumeBtn.querySelector('i');
      if (!icon) return;
      if (player.muted || player.volume === 0) {
        icon.className = 'fas fa-volume-mute';
      } else if (player.volume < 0.5) {
        icon.className = 'fas fa-volume-down';
      } else {
        icon.className = 'fas fa-volume-up';
      }
    }
    
    // Volume slider
    if (volumeContainer) {
      let isDraggingVolume = false;
      let activeVolumePointerId = null;

      const setVolumeByClientX = (clientX) => {
        const rect = volumeContainer.getBoundingClientRect();
        if (!rect.width) return;
        const percent = (clientX - rect.left) / rect.width;
        player.volume = Math.max(0, Math.min(1, percent));
        player.muted = false;
        if (volumeProgress) {
          volumeProgress.style.width = (player.volume * 100) + '%';
        }
        updateVolumeIcon();
        localStorage.setItem('videoVolume', player.volume.toString());
      };

      const startVolumeDrag = (clientX, pointerId = null) => {
        isDraggingVolume = true;
        activeVolumePointerId = pointerId;
        setVolumeByClientX(clientX);
      };

      const endVolumeDrag = (pointerId = null) => {
        if (!isDraggingVolume) return;
        if (activeVolumePointerId !== null && pointerId !== null && pointerId !== activeVolumePointerId) return;
        isDraggingVolume = false;
        activeVolumePointerId = null;
      };

      volumeContainer.addEventListener('click', (e) => {
        setVolumeByClientX(e.clientX);
      });

      volumeContainer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        startVolumeDrag(e.clientX, e.pointerId);
        if (volumeContainer.setPointerCapture) {
          try { volumeContainer.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      volumeContainer.addEventListener('pointermove', (e) => {
        if (!isDraggingVolume) return;
        if (activeVolumePointerId !== null && e.pointerId !== activeVolumePointerId) return;
        e.preventDefault();
        setVolumeByClientX(e.clientX);
      });

      document.addEventListener('pointermove', (e) => {
        if (!isDraggingVolume) return;
        if (activeVolumePointerId !== null && e.pointerId !== activeVolumePointerId) return;
        setVolumeByClientX(e.clientX);
      });

      const finishPointerDrag = (e) => {
        if (volumeContainer.releasePointerCapture) {
          try { volumeContainer.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        endVolumeDrag(e.pointerId);
      };

      volumeContainer.addEventListener('pointerup', finishPointerDrag);
      document.addEventListener('pointerup', finishPointerDrag);
      volumeContainer.addEventListener('pointercancel', (e) => endVolumeDrag(e.pointerId));
      volumeContainer.addEventListener('lostpointercapture', () => endVolumeDrag());

      volumeContainer.addEventListener('mousedown', (e) => {
        if (isDraggingVolume) return;
        e.preventDefault();
        startVolumeDrag(e.clientX);
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDraggingVolume || activeVolumePointerId !== null) return;
        setVolumeByClientX(e.clientX);
      });

      document.addEventListener('mouseup', () => {
        if (activeVolumePointerId !== null) return;
        endVolumeDrag();
      });
    }
    
    // Restore saved video volume
    const savedVideoVolume = localStorage.getItem('videoVolume');
    if (savedVideoVolume !== null) {
      const volume = parseFloat(savedVideoVolume);
      // Validate volume is within range [0, 1]
      if (!isNaN(volume) && volume >= 0 && volume <= 1) {
        player.volume = volume;
        if (volumeProgress) {
          volumeProgress.style.width = (player.volume * 100) + '%';
        }
      }
    }
    
    // Restore saved video mute state
    const savedVideoMuted = localStorage.getItem('videoMuted');
    if (savedVideoMuted !== null) {
      player.muted = savedVideoMuted === 'true';
    }
    
    // Update volume icon once after restoration
    updateVolumeIcon();
    
    // Controls visibility state for click-to-pause
    let controlsVisible = true;
    let suppressTapToggleUntil = 0;

    function shouldSuppressTapToggle() {
        return Date.now() < suppressTapToggleUntil;
    }

    function setControlsVisibility(visible) {
        const container = document.getElementById('video-player-container');
        if (!container) return;

        if (visible) {
            showControls();
            return;
        }

        // Manual toggle should work even outside fullscreen
        hideControls(true);
    }
    
    // Update overlay info when video metadata changes
    function updateVideoOverlay() {
        const overlayTitle = document.getElementById('overlay-anime-title');
        const overlayEpisode = document.getElementById('overlay-episode-info');
        
        if (window.currentWatchingAnime) {
            if (overlayTitle) overlayTitle.textContent = window.currentWatchingAnime.title || 'Anime';
            if (overlayEpisode) {
                const seasonText = window.currentWatchingAnime.seasonName || `Temporada ${window.currentWatchingAnime.season}`;
                overlayEpisode.textContent = `${seasonText} • Episódio ${window.currentWatchingAnime.episode}`;
            }
        }
    }
    
    // Listen for when episode changes
    player.addEventListener('loadedmetadata', updateVideoOverlay);

    const marathonSessionState = {
      profileId: null,
      watchedCount: 0
    };
    let nextEpisodeCountdownTimer = null;
    let nextEpisodeCountdownSource = null;
    const countdownInlineEl = document.getElementById('next-episode-countdown');
    const floatingNextEpisodeBtn = document.getElementById('floating-next-episode-btn');
    const floatingActionsEl = document.getElementById('video-floating-actions');

    function syncFloatingActionsLayout() {
      if (!floatingActionsEl) return;
      if (isCompactMobileViewport()) {
        floatingActionsEl.style.left = '8px';
        floatingActionsEl.style.right = '8px';
        floatingActionsEl.style.bottom = '86px';
        floatingActionsEl.style.alignItems = 'stretch';
      } else {
        floatingActionsEl.style.left = '';
        floatingActionsEl.style.right = '12px';
        floatingActionsEl.style.bottom = '72px';
        floatingActionsEl.style.alignItems = 'flex-end';
      }
    }
    syncFloatingActionsLayout();
    window.addEventListener('resize', syncFloatingActionsLayout);
    window.addEventListener('orientationchange', syncFloatingActionsLayout);

    function isEndingNearEpisodeEnd(endingSegment) {
      if (!endingSegment || !Number.isFinite(player.duration) || player.duration <= 0) return false;
      return Number(endingSegment.end) >= (player.duration - 3);
    }

    function setCountdownMessage(message, asPause = false) {
      if (countdownInlineEl) {
        countdownInlineEl.style.display = 'block';
        countdownInlineEl.textContent = message;
      }
      if (floatingNextEpisodeBtn) {
        floatingNextEpisodeBtn.style.display = 'block';
        floatingNextEpisodeBtn.textContent = asPause ? '⏸️ Pausar maratona' : message;
      }
    }

    function hideCountdownMessage() {
      if (countdownInlineEl) countdownInlineEl.style.display = 'none';
      if (floatingNextEpisodeBtn) floatingNextEpisodeBtn.style.display = 'none';
    }

    function getMarathonPreferences() {
      const defaults = {
        enabled: true,
        autoNext: true,
        breakEveryEpisodes: 0,
        sessionLimit: 0,
        autoSkipOpening: false,
        autoSkipEnding: false,
        countdownSeconds: 8
      };
      const fromProfileManager = (window.profileManager && typeof window.profileManager.getMarathonPreferences === 'function')
        ? window.profileManager.getMarathonPreferences()
        : null;
      const fromAnimeDb = (window.animeDB && typeof window.animeDB.getActiveProfileMarathonPreferences === 'function')
        ? window.animeDB.getActiveProfileMarathonPreferences()
        : null;
      return { ...defaults, ...(fromAnimeDb || {}), ...(fromProfileManager || {}) };
    }

    function getNextEpisodeTarget() {
      if (!window.currentAnime || !window.currentWatchingAnime) return null;
      const currentSeason = window.currentAnime.seasons?.find(s => s.number === window.currentWatchingAnime.season);
      if (currentSeason?.episodes) {
        const nextEpisodeIndex = window.currentWatchingAnime.episode;
        if (nextEpisodeIndex < currentSeason.episodes.length) {
          return { season: window.currentWatchingAnime.season, episodeIndex: nextEpisodeIndex };
        }
      }
      const nextSeason = window.currentAnime.seasons?.find(s => s.number === window.currentWatchingAnime.season + 1);
      if (nextSeason?.episodes?.length) {
        return { season: nextSeason.number, episodeIndex: 0 };
      }
      return null;
    }

    function goToNextEpisode() {
      const target = getNextEpisodeTarget();
      if (!target || typeof window.openEpisode !== 'function') return false;
      window.openEpisode(window.currentAnime, target.season, target.episodeIndex);
      return true;
    }

    function clearNextEpisodeCountdown() {
      if (nextEpisodeCountdownTimer) {
        clearInterval(nextEpisodeCountdownTimer);
        nextEpisodeCountdownTimer = null;
      }
      nextEpisodeCountdownSource = null;
      hideCountdownMessage();
    }

    function ensureSessionState() {
      const activeProfile = window.profileManager?.getActiveProfile?.();
      if (!activeProfile?.id) return;
      if (marathonSessionState.profileId !== activeProfile.id) {
        marathonSessionState.profileId = activeProfile.id;
        marathonSessionState.watchedCount = 0;
      }
    }

    function shouldPauseByMarathonPolicy(prefs, completedOffset = 0) {
      ensureSessionState();
      const nextCount = marathonSessionState.watchedCount + completedOffset;
      const hasSessionLimit = prefs.sessionLimit > 0 && nextCount >= prefs.sessionLimit;
      const hasBreakInterval = prefs.breakEveryEpisodes > 0 && (nextCount % prefs.breakEveryEpisodes === 0);
      return { shouldPause: hasSessionLimit || hasBreakInterval, nextCount };
    }

    function startNextEpisodeCountdown(source = 'ended') {
      if (nextEpisodeCountdownTimer && nextEpisodeCountdownSource === source) return;
      const prefs = getMarathonPreferences();
      const target = getNextEpisodeTarget();
      if (!target || !prefs.enabled || !prefs.autoNext) {
        if (source === 'ended') hideCountdownMessage();
        return;
      }

      if (!nextEpisodeCountdownTimer) {
        const policy = shouldPauseByMarathonPolicy(prefs, source === 'ending' ? 1 : 0);
        if (policy.shouldPause) {
          setCountdownMessage(`⏸️ Pausa da maratona após ${policy.nextCount} episódios.`, true);
          return;
        }
      }

      if (nextEpisodeCountdownTimer && nextEpisodeCountdownSource !== source) {
        clearInterval(nextEpisodeCountdownTimer);
      }

      nextEpisodeCountdownSource = source;
      let remaining = Math.max(1, Number(prefs.countdownSeconds) || 8);
      setCountdownMessage(`⏭️ Próximo episódio em ${remaining}s`);
      nextEpisodeCountdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (source === 'ending') {
            ensureSessionState();
            marathonSessionState.watchedCount += 1;
          }
          clearNextEpisodeCountdown();
          goToNextEpisode();
          return;
        }
        setCountdownMessage(`⏭️ Próximo episódio em ${remaining}s`);
      }, 1000);
    }

    function handleEpisodeEndedWithMarathon() {
      clearNextEpisodeCountdown();
      const prefs = getMarathonPreferences();
      ensureSessionState();
      marathonSessionState.watchedCount += 1;

      const policy = shouldPauseByMarathonPolicy(prefs);
      if (policy.shouldPause) {
        clearNextEpisodeCountdown();
        setCountdownMessage(`⏸️ Pausa da maratona após ${policy.nextCount} episódios.`, true);
        return;
      }

      startNextEpisodeCountdown('ended');
    }
    
    // Next episode button functionality
    const nextEpisodeBtn = safe('next-episode-btn');
    if (nextEpisodeBtn) {
        nextEpisodeBtn.addEventListener('click', () => {
            clearNextEpisodeCountdown();
            goToNextEpisode();
        });
    }
    if (floatingNextEpisodeBtn) {
      floatingNextEpisodeBtn.addEventListener('click', () => {
        clearNextEpisodeCountdown();
        goToNextEpisode();
      });
    }
    
    // Double-tap to seek (mobile) - Track tap times and positions
    let lastTapTime = 0;
    let lastTapZone = null;
    const DOUBLE_TAP_DELAY = 300; // ms
    
    function handleDoubleTapSeek(zone) {
        const seekFeedbackLeft = document.getElementById('seek-feedback-left');
        const seekFeedbackRight = document.getElementById('seek-feedback-right');
        
        if (zone === 'left') {
            player.currentTime = Math.max(0, player.currentTime - 5);
            if (seekFeedbackLeft) {
                seekFeedbackLeft.classList.remove('show');
                void seekFeedbackLeft.offsetWidth; // Force reflow
                seekFeedbackLeft.classList.add('show');
                setTimeout(() => seekFeedbackLeft.classList.remove('show'), 500);
            }
        } else if (zone === 'right') {
            player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
            if (seekFeedbackRight) {
                seekFeedbackRight.classList.remove('show');
                void seekFeedbackRight.offsetWidth; // Force reflow
                seekFeedbackRight.classList.add('show');
                setTimeout(() => seekFeedbackRight.classList.remove('show'), 500);
            }
        }
    }
    
    // Setup tap zones
    const tapZoneLeft = document.getElementById('tap-zone-left');
    const tapZoneCenter = document.getElementById('tap-zone-center');
    const tapZoneRight = document.getElementById('tap-zone-right');
    
    // Left zone - double tap to rewind
    if (tapZoneLeft) {
        tapZoneLeft.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            if (lastTapZone === 'left' && currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
                e.preventDefault();
                handleDoubleTapSeek('left');
                // Keep lastTapTime updated for consecutive double-taps
                lastTapTime = currentTime;
                // Keep lastTapZone as 'left' for next tap
            } else {
                lastTapTime = currentTime;
                lastTapZone = 'left';
            }
        });
        tapZoneLeft.addEventListener('click', (e) => {
            if (shouldSuppressTapToggle()) {
                e.preventDefault();
                return;
            }

            // Single click - toggle controls visibility
            setControlsVisibility(!controlsVisible);
        });
    }
    
    // Right zone - double tap to forward
    if (tapZoneRight) {
        tapZoneRight.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            if (lastTapZone === 'right' && currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
                e.preventDefault();
                handleDoubleTapSeek('right');
                // Keep lastTapTime updated for consecutive double-taps
                lastTapTime = currentTime;
                // Keep lastTapZone as 'right' for next tap
            } else {
                lastTapTime = currentTime;
                lastTapZone = 'right';
            }
        });
        tapZoneRight.addEventListener('click', (e) => {
            if (shouldSuppressTapToggle()) {
                e.preventDefault();
                return;
            }

            // Single click - toggle controls visibility
            setControlsVisibility(!controlsVisible);
        });
    }
    
    // Center zone - single click to play/pause
    if (tapZoneCenter) {
        tapZoneCenter.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (shouldSuppressTapToggle()) {
                return;
            }

            if (player.paused) {
                player.play().catch(() => {});
            } else {
                player.pause();
            }
        });
        // Also allow double tap to hide controls
        tapZoneCenter.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            if (lastTapZone === 'center' && currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
                // Double tap on center - toggle controls
                setControlsVisibility(!controlsVisible);
                lastTapTime = 0;
                lastTapZone = null;
            } else {
                lastTapTime = currentTime;
                lastTapZone = 'center';
            }
        });
    }
    
    // PC: click on video/container to toggle pause/play
    const videoContainer = document.getElementById('video-player-container');
    const togglePlayback = () => {
        if (player.paused) {
            player.play().catch(() => {});
        } else {
            player.pause();
        }
    };

    player.addEventListener('click', (e) => {
        if (e.target !== player) return;
        togglePlayback();
    });

    if (videoContainer) {
        videoContainer.addEventListener('click', (e) => {
            if (e.target.closest('#custom-video-controls')) return;
            if (e.target.closest('#video-info-overlay')) return;
            if (e.target.closest('.video-banner')) return;
            if (e.target.closest('#video-tap-zones')) return;
            togglePlayback();
        });
    }
    
    // Mobile: Double-tap detection on video element for seek
    let videoLastTapTime = 0;
    let videoLastTapZone = null;
    
    player.addEventListener('touchend', (e) => {
        const currentTime = Date.now();
        const touch = e.changedTouches[0];
        const videoRect = player.getBoundingClientRect();
        const tapX = touch.clientX - videoRect.left;
        const videoWidth = videoRect.width;
        // Larger side zones (37.5% each side, 25% center)
        const sideZoneWidth = videoWidth * 0.375;
        
        // Determine which zone was tapped
        let zone = 'center';
        if (tapX < sideZoneWidth) {
            zone = 'left';
        } else if (tapX > videoWidth - sideZoneWidth) {
            zone = 'right';
        }
        
        if (videoLastTapZone === zone && currentTime - videoLastTapTime < DOUBLE_TAP_DELAY) {
            // Double tap detected in same zone
            e.preventDefault();
            if (zone === 'left') {
                handleDoubleTapSeek('left');
                // Keep tracking for consecutive double-taps
                videoLastTapTime = currentTime;
            } else if (zone === 'right') {
                handleDoubleTapSeek('right');
                // Keep tracking for consecutive double-taps
                videoLastTapTime = currentTime;
            } else {
                // Center double tap - toggle play/pause
                if (player.paused) {
                    player.play().catch(() => {});
                } else {
                    player.pause();
                }
                videoLastTapTime = 0;
                videoLastTapZone = null;
            }
        } else {
            // Single tap - toggle controls
            videoLastTapTime = currentTime;
            videoLastTapZone = zone;

            if (shouldSuppressTapToggle()) {
                return;
            }
            
            setControlsVisibility(!controlsVisible);
        }
    });

    const floatingSkipOpeningBtn = safe('floating-skip-opening-btn');
    const floatingSkipEndingBtn = safe('floating-skip-ending-btn');
    const skipEndingBtn = safe('skip-ending-btn');
    const skipOpeningCtrl = new SkipController(player, 'skip-opening-btn', 'Pular abertura');
    const floatingSkipOpeningCtrl = new SkipController(player, 'floating-skip-opening-btn', 'Pular abertura');
    const skipEndingCtrl = new SkipController(player, 'skip-ending-btn', 'Pular encerramento');
    const floatingSkipEndingCtrl = new SkipController(player, 'floating-skip-ending-btn', 'Pular encerramento');
    window.currentOpeningData = null;
    window.currentEndingData = null;
    window.updateOpeningData = function(data){
      window.currentOpeningData = data && typeof data.start === 'number' ? data : null;
      if(skipOpeningCtrl && typeof skipOpeningCtrl.setSegment === 'function') skipOpeningCtrl.setSegment(window.currentOpeningData);
      if(floatingSkipOpeningCtrl && typeof floatingSkipOpeningCtrl.setSegment === 'function') floatingSkipOpeningCtrl.setSegment(window.currentOpeningData);
    };
    window.updateEndingData = function(data){
      window.currentEndingData = data && typeof data.start === 'number' ? data : null;
      if(skipEndingCtrl && typeof skipEndingCtrl.setSegment === 'function') skipEndingCtrl.setSegment(window.currentEndingData);
      if(floatingSkipEndingCtrl && typeof floatingSkipEndingCtrl.setSegment === 'function') floatingSkipEndingCtrl.setSegment(window.currentEndingData);
      clearNextEpisodeCountdown();
    };
    window.updateEpisodeSegments = function(segments){
      window.updateOpeningData(segments?.opening || null);
      window.updateEndingData(segments?.ending || null);
    };

    player.addEventListener('timeupdate', () => {
      const prefs = getMarathonPreferences();
      const currentTime = player.currentTime || 0;
      const inEnding = !!(window.currentEndingData && currentTime >= window.currentEndingData.start && currentTime < window.currentEndingData.end);
      const endingNearEpisodeEnd = isEndingNearEpisodeEnd(window.currentEndingData);
      const shouldShowEndingCountdown = prefs.enabled && prefs.autoNext && inEnding && endingNearEpisodeEnd;

      if (shouldShowEndingCountdown) {
        startNextEpisodeCountdown('ending');
        if (skipEndingBtn) skipEndingBtn.style.display = 'none';
        if (floatingSkipEndingBtn) floatingSkipEndingBtn.style.display = 'none';
      } else if (nextEpisodeCountdownSource === 'ending') {
        clearNextEpisodeCountdown();
      }

      if (prefs.enabled && prefs.autoSkipOpening && window.currentOpeningData && currentTime >= window.currentOpeningData.start && currentTime < window.currentOpeningData.end) {
        player.currentTime = window.currentOpeningData.end;
      }
      if (prefs.enabled && prefs.autoSkipEnding && inEnding && !endingNearEpisodeEnd) {
        player.currentTime = window.currentEndingData.end;
      }

      if (floatingActionsEl) {
        const hasVisibleAction = [floatingNextEpisodeBtn, floatingSkipOpeningBtn, floatingSkipEndingBtn]
          .some(el => el && el.style.display !== 'none');
        const shouldShowFloating = hasVisibleAction && !controlsVisible;
        floatingActionsEl.style.display = shouldShowFloating ? 'flex' : 'none';
      }
    });

    const pipBtn = safe('pip-btn');
    if (pipBtn) {
      const syncPipButton = () => {
        const compactMobile = isCompactMobileViewport();
        pipBtn.style.display = compactMobile ? 'none' : '';
        if (compactMobile) clearCustomMiniPlayer();
      };

      syncPipButton();
      window.addEventListener('resize', syncPipButton);
      window.addEventListener('orientationchange', syncPipButton);

      pipBtn.addEventListener('click', async ()=>{
        if (isCompactMobileViewport()) {
          await toggleFullscreen();
          return;
        }
        try {
          if (player.requestPictureInPicture) await player.requestPictureInPicture();
          else showCustomMiniPlayer(player);
        } catch(e){
          console.warn('PiP error', e);
          showCustomMiniPlayer(player);
        }
      });
    }

    const fsBtn = safe('fullscreen-btn'); if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
    
    // Listener para mudanças de fullscreen
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
        document.addEventListener(event, () => {
            const container = document.getElementById('video-player-container');
            if (!container) return;
            
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
                container.classList.remove('is-fullscreen');
                container.classList.remove('controls-hidden');
                controlsVisible = true;
            }
        });
    });

    // Auto-hide controls in fullscreen mode
    let controlsHideTimeout = null;
    const HIDE_CONTROLS_DELAY = 3000; // 3 seconds of inactivity
    
    function isInFullscreen() {
        const container = document.getElementById('video-player-container');
        return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || (container && container.classList.contains('is-fullscreen'));
    }
    
    function showControls() {
        const container = document.getElementById('video-player-container');
        if (!container) return;
        
        container.classList.remove('controls-hidden');
        container.classList.add('controls-visible');
        controlsVisible = true;
        
        // Reset hide timer
        if (controlsHideTimeout) {
            clearTimeout(controlsHideTimeout);
        }
        
        // Only auto-hide if in fullscreen and video is playing
        if (isInFullscreen() && player && !player.paused) {
            controlsHideTimeout = setTimeout(() => {
                if (isInFullscreen() && !player.paused) {
                    container.classList.add('controls-hidden');
                    container.classList.remove('controls-visible');
                    controlsVisible = false;
                }
            }, HIDE_CONTROLS_DELAY);
        }
    }
    
    function hideControls(force = false) {
        const container = document.getElementById('video-player-container');
        if (!container || (!force && !isInFullscreen())) return;
        
        container.classList.add('controls-hidden');
        container.classList.remove('controls-visible');
        controlsVisible = false;
    }
    
    // Mouse movement - show controls (PC)
    const container = document.getElementById('video-player-container');
    if (container) {
        container.addEventListener('mousemove', () => {
            showControls();
        });
        
        // Touch behavior:
        // - If controls are already visible, keep the auto-hide timer alive.
        // - If controls are hidden, first touch should only reveal controls (no immediate re-toggle).
        container.addEventListener('touchstart', () => {
            if (controlsVisible) {
                showControls();
                return;
            }

            setControlsVisibility(true);
            suppressTapToggleUntil = Date.now() + 350;
        }, { passive: true });
        
        // When mouse leaves container, start hide timer
        container.addEventListener('mouseleave', () => {
            if (isInFullscreen() && player && !player.paused) {
                if (controlsHideTimeout) {
                    clearTimeout(controlsHideTimeout);
                }
                controlsHideTimeout = setTimeout(hideControls, HIDE_CONTROLS_DELAY);
            }
        });
    }
    
    // Show controls when video is paused
    player.addEventListener('pause', () => {
      showControls();
      persistContinueWatchingNow(true);
      if (nextEpisodeCountdownSource === 'ending') clearNextEpisodeCountdown();
    });
    
    // Hide controls when video starts playing (after delay)
    player.addEventListener('play', () => {
        if (isInFullscreen()) {
            if (controlsHideTimeout) {
                clearTimeout(controlsHideTimeout);
            }
            controlsHideTimeout = setTimeout(hideControls, HIDE_CONTROLS_DELAY);
        }
    });
    
    // Show controls when seeking
    player.addEventListener('seeking', () => {
      showControls();
      persistContinueWatchingDebounced();
    });

    player.addEventListener('ended', (e) => {
      window.__ANIVERSE_MARATHON_HANDLED = true;
      if (e && typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      persistContinueWatchingNow(true);
      handleEpisodeEndedWithMarathon();
    });
    player.addEventListener('play', () => clearNextEpisodeCountdown());
    window.addEventListener('beforeunload', () => persistContinueWatchingNow(true));
    
    // Update overlay when episode info changes
    window.updateVideoOverlay = updateVideoOverlay;
  });

  window.showCustomMiniPlayer = showCustomMiniPlayer;
  window.clearCustomMiniPlayer = clearCustomMiniPlayer;
  window.showVideoError = showVideoError;
  window.clearVideoError = clearVideoError;
  window.toggleFullscreen = toggleFullscreen;
})();

// Keyboard shortcuts for video player
function handleVideoHotkeys(e) {
    if (e.__aniverseVideoHandled) return;

    const videoModal = document.getElementById('video-modal');
    const player = document.getElementById('anime-player');
    if (!player) return;

    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    const modalVisible = !!(videoModal && getComputedStyle(videoModal).display !== 'none');
    const hasVideoSource = !!(player.currentSrc || player.src);
    const isVideoActive = (modalVisible && hasVideoSource) || isFullscreen;
    if (!isVideoActive) return;

    const target = e.target;
    const tagName = (target?.tagName || '').toUpperCase();
    const isTypingTarget = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
    if (isTypingTarget) return;

    const key = String(e.key || '').toLowerCase();
    const code = String(e.code || '');
    const isSpace = code === 'Space' || key === ' ' || key === 'spacebar';
    const isHotkey = isSpace || ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'k', 'm', 'f'].includes(key) || code === 'KeyK';
    if (!isHotkey) return;

    e.__aniverseVideoHandled = true;
    e.preventDefault();
    e.stopPropagation();

    const togglePlayback = () => {
        if (player.paused) player.play().catch(() => {});
        else player.pause();
    };

    if (isSpace) {
        togglePlayback();
        return;
    }

    switch (key) {
        case 'k':
            togglePlayback();
            break;
        case 'arrowleft':
            player.currentTime = Math.max(0, player.currentTime - 5);
            break;
        case 'arrowright':
            player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
            break;
        case 'arrowup':
            player.volume = Math.min(1, player.volume + 0.1);
            player.muted = false;
            updateVideoVolumeIcon();
            localStorage.setItem('videoVolume', player.volume.toString());
            break;
        case 'arrowdown':
            player.volume = Math.max(0, player.volume - 0.1);
            updateVideoVolumeIcon();
            localStorage.setItem('videoVolume', player.volume.toString());
            break;
        case 'm':
            player.muted = !player.muted;
            updateVideoVolumeIcon();
            localStorage.setItem('videoMuted', player.muted.toString());
            break;
        case 'f':
            if (typeof toggleFullscreen === 'function') toggleFullscreen();
            break;
        default:
            if (code === 'KeyK') togglePlayback();
            break;
    }
}

document.addEventListener('keydown', handleVideoHotkeys, { capture: true });
document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('anime-player');
    const container = document.getElementById('video-player-container');

    if (container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '0');
    }
    if (player && !player.hasAttribute('tabindex')) {
        player.setAttribute('tabindex', '0');
    }

    if (container) container.addEventListener('keydown', handleVideoHotkeys, { capture: true });
    if (player) player.addEventListener('keydown', handleVideoHotkeys, { capture: true });
});

function updateVideoVolumeIcon() {
    const player = document.getElementById('anime-player');
    const volumeBtn = document.getElementById('volume-btn');
    if (!player || !volumeBtn) return;
    
    const icon = volumeBtn.querySelector('i');
    if (icon) {
        if (player.muted || player.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (player.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }
    
    // Update volume progress bar
    const volumeProgress = document.getElementById('volume-progress');
    if (volumeProgress) {
        volumeProgress.style.width = player.muted ? '0%' : (player.volume * 100) + '%';
    }
}
