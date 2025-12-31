/* js/video-player.js - robust player: click-to-pause, skip-controller, PiP fallback, container fullscreen */
(function(){
  function safe(id){ return document.getElementById(id); }
  function showVideoError(msg){ let el=document.getElementById('video-error-container'); if(!el){ el=document.createElement('div'); el.id='video-error-container'; Object.assign(el.style,{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.78)',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:100010,pointerEvents:'none'}); (document.getElementById('video-player-container')||document.body).appendChild(el);} el.textContent=msg; }
  function clearVideoError(){ const el=document.getElementById('video-error-container'); if(el) el.remove(); }

  function SkipController(player, skipId){
    this.player = player; this.skipBtn = safe(skipId); this.opening = null;
    if(!this.player || !this.skipBtn){ console.warn('SkipController: missing elements'); return; }
    this.player.addEventListener('timeupdate', ()=> this.update());
    this.skipBtn.addEventListener('click', ()=> { if (this.opening) this.player.currentTime = this.opening.end; });
  }
  SkipController.prototype.setOpening = function(opening){ this.opening = opening; this.update(); };
  SkipController.prototype.update = function(){
    if(!this.player || !this.skipBtn) return;
    if(!this.opening){ this.skipBtn.style.display='none'; return; }
    const t = this.player.currentTime || 0; const show = (t >= this.opening.start && t < this.opening.end);
    this.skipBtn.style.display = show ? 'block' : 'none';
    if(show) this.skipBtn.textContent = `⏩ Pular (${Math.ceil(Math.max(0,this.opening.end - t))}s)`;
  };

  function showCustomMiniPlayer(player){
    if(!player) return;
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
        if(window.currentOpeningData && window.currentOpeningData.end) {
          player.currentTime = window.currentOpeningData.end;
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

  document.addEventListener('DOMContentLoaded', ()=>{
    const player = safe('anime-player'); if(!player){ console.warn('#anime-player not found'); return; }
    
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
    });
    
    // Timeline click
    if (timelineContainer) {
      timelineContainer.addEventListener('click', (e) => {
        const rect = timelineContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (player.duration) {
          player.currentTime = percent * player.duration;
        }
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
      volumeContainer.addEventListener('click', (e) => {
        const rect = volumeContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.volume = Math.max(0, Math.min(1, percent));
        player.muted = false;
        if (volumeProgress) {
          volumeProgress.style.width = (player.volume * 100) + '%';
        }
        updateVolumeIcon();
        // Save video volume preference
        localStorage.setItem('videoVolume', player.volume.toString());
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
    
    // click on video toggles pause/play (only when clicking the element itself)
    player.addEventListener('click', (e)=> { if(e.target!==player) return; if(player.paused) player.play().catch(()=>{}); else player.pause(); });

    const skipCtrl = new SkipController(player, 'skip-opening-btn');
    window.updateOpeningData = function(data){ window.currentOpeningData = data && typeof data.start === 'number' ? data : null; if(skipCtrl && typeof skipCtrl.setOpening === 'function') skipCtrl.setOpening(window.currentOpeningData); };

    const pipBtn = safe('pip-btn');
    if (pipBtn) pipBtn.addEventListener('click', async ()=>{ try { if (player.requestPictureInPicture) await player.requestPictureInPicture(); else showCustomMiniPlayer(player); } catch(e){ console.warn('PiP error', e); showCustomMiniPlayer(player); } });

    const fsBtn = safe('fullscreen-btn'); if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
    
    // Listener para mudanças de fullscreen
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
        document.addEventListener(event, () => {
            const container = document.getElementById('video-player-container');
            if (!container) return;
            
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
                container.classList.remove('is-fullscreen');
                container.classList.remove('controls-hidden');
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
        
        // Reset hide timer
        if (controlsHideTimeout) {
            clearTimeout(controlsHideTimeout);
        }
        
        // Only auto-hide if in fullscreen and video is playing
        if (isInFullscreen() && player && !player.paused) {
            controlsHideTimeout = setTimeout(() => {
                if (isInFullscreen() && !player.paused) {
                    container.classList.add('controls-hidden');
                }
            }, HIDE_CONTROLS_DELAY);
        }
    }
    
    function hideControls() {
        const container = document.getElementById('video-player-container');
        if (!container || !isInFullscreen()) return;
        
        container.classList.add('controls-hidden');
    }
    
    // Mouse movement - show controls (PC)
    const container = document.getElementById('video-player-container');
    if (container) {
        container.addEventListener('mousemove', () => {
            if (isInFullscreen()) {
                showControls();
            }
        });
        
        // Touch events - show controls (mobile)
        container.addEventListener('touchstart', () => {
            if (isInFullscreen()) {
                showControls();
            }
        });
        
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
    player.addEventListener('pause', showControls);
    
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
    player.addEventListener('seeking', showControls);
  });

  window.showCustomMiniPlayer = showCustomMiniPlayer;
  window.showVideoError = showVideoError;
  window.clearVideoError = clearVideoError;
  window.toggleFullscreen = toggleFullscreen;
})();

// Keyboard shortcuts for video player
document.addEventListener('keydown', (e) => {
    // PRIORIDADE 1: Se modal de vídeo está aberto, responder APENAS vídeo
    const videoModal = document.getElementById('video-modal');
    const player = document.getElementById('anime-player');
    
    if (videoModal && videoModal.style.display === 'flex' && player) {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Prevenir ações padrão do navegador
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'k', 'm', 'f'].includes(e.key)) {
            e.preventDefault();
        }
        
        switch(e.key) {
            case ' ':
            case 'k':
                if (player.paused) {
                    player.play().catch(() => {});
                } else {
                    player.pause();
                }
                break;
                
            case 'ArrowLeft':
                player.currentTime = Math.max(0, player.currentTime - 5);
                break;
                
            case 'ArrowRight':
                player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
                break;
                
            case 'ArrowUp':
                player.volume = Math.min(1, player.volume + 0.1);
                player.muted = false;
                updateVideoVolumeIcon();
                // Save video volume preference
                localStorage.setItem('videoVolume', player.volume.toString());
                break;
                
            case 'ArrowDown':
                player.volume = Math.max(0, player.volume - 0.1);
                updateVideoVolumeIcon();
                // Save video volume preference
                localStorage.setItem('videoVolume', player.volume.toString());
                break;
                
            case 'm':
                player.muted = !player.muted;
                // Atualizar ícone de volume
                updateVideoVolumeIcon();
                // Save video mute preference
                localStorage.setItem('videoMuted', player.muted.toString());
                break;
                
            case 'f':
                if (typeof toggleFullscreen === 'function') {
                    toggleFullscreen();
                }
                break;
        }
        
        // IMPORTANTE: Retornar aqui para NÃO processar comandos de música
        return;
    }
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
