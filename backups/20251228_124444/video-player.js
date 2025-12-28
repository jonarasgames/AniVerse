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
    if(!mini){ mini = document.createElement('div'); mini.id='mini-player'; Object.assign(mini.style,{position:'fixed',right:'12px',bottom:'12px',width:'320px',height:'180px',zIndex:100000,background:'#000',borderRadius:'8px',overflow:'hidden'}); document.body.appendChild(mini); }
    let placeholder = document.getElementById('anime-player-placeholder');
    if(!placeholder){ placeholder = document.createElement('div'); placeholder.id='anime-player-placeholder'; placeholder.style.display='none'; const cont=document.getElementById('video-player-container'); if(cont) cont.appendChild(placeholder); }
    mini.appendChild(player);
    player.style.width='100%'; player.style.height='100%'; player.playsInline = true;
    if(!mini.querySelector('.mini-close')){ const c=document.createElement('button'); c.className='mini-close'; c.textContent='✕'; Object.assign(c.style,{position:'absolute',top:'6px',right:'6px',zIndex:10}); mini.appendChild(c); c.addEventListener('click', ()=>{ const container=document.getElementById('video-player-container'); if(container && placeholder) container.appendChild(player); try{ mini.remove(); }catch(e){} }); }
  }

  async function toggleFullscreen(){
    const container = document.getElementById('video-player-container'); if(!container) return;
    try { if(!document.fullscreenElement){ await container.requestFullscreen(); container.classList.add('is-fullscreen'); } else { await document.exitFullscreen(); container.classList.remove('is-fullscreen'); } } catch(e){ console.warn('fullscreen failed', e); container.classList.toggle('is-fullscreen'); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const player = safe('anime-player'); if(!player){ console.warn('#anime-player not found'); return; }
    // click on video toggles pause/play (only when clicking the element itself)
    player.addEventListener('click', (e)=> { if(e.target!==player) return; if(player.paused) player.play().catch(()=>{}); else player.pause(); });

    const skipCtrl = new SkipController(player, 'skip-opening-btn');
    window.updateOpeningData = function(data){ window.currentOpeningData = data && typeof data.start === 'number' ? data : null; if(skipCtrl && typeof skipCtrl.setOpening === 'function') skipCtrl.setOpening(window.currentOpeningData); };

    const pipBtn = safe('pip-btn');
    if (pipBtn) pipBtn.addEventListener('click', async ()=>{ try { if (player.requestPictureInPicture) await player.requestPictureInPicture(); else showCustomMiniPlayer(player); } catch(e){ console.warn('PiP error', e); showCustomMiniPlayer(player); } });

    const fsBtn = safe('fullscreen-btn'); if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', ()=> { const cont=document.getElementById('video-player-container'); if(!document.fullscreenElement && cont) cont.classList.remove('is-fullscreen'); });
  });

  window.showCustomMiniPlayer = showCustomMiniPlayer;
  window.showVideoError = showVideoError;
  window.clearVideoError = clearVideoError;
})();
