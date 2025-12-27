let videoLoadTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
  const clearBtn = document.getElementById('clear-history');
  if (clearBtn) clearBtn.addEventListener('click', ()=> {
    if (!confirm('Apagar histórico?')) return;
    try { localStorage.removeItem('continueWatching'); localStorage.removeItem('watchedEpisodes'); } catch(e){}
    if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(),'continue-watching-grid');
    alert('Histórico apagado.');
  });
});

function showVideoError(msg){ let el=document.getElementById('video-error-container'); if(!el){ el=document.createElement('div'); el.id='video-error-container'; Object.assign(el.style,{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.78)',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:100010,pointerEvents:'none'}); (document.getElementById('video-player-container')||document.body).appendChild(el);} el.textContent=msg; }
function clearVideoError(){ const el=document.getElementById('video-error-container'); if(el) el.remove(); }

function onVideoSetSource(player){
  if(!player) return;
  if(videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout=null; }
  clearVideoError();
  videoLoadTimeout = setTimeout(()=> {
    if(player && player.readyState < 3 && !player.paused) showVideoError('Tempo de carregamento excedido. Clique no play para tentar novamente.');
    videoLoadTimeout = null;
  },15000);
  const onPlaying = function(){ if(videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout=null; } clearVideoError(); player.removeEventListener('playing', onPlaying); };
  player.addEventListener('playing', onPlaying);
  const onError = function(){ showVideoError('Erro ao reproduzir. Clique no play para tentar novamente.'); if(videoLoadTimeout){ clearTimeout(videoLoadTimeout); videoLoadTimeout=null; } player.removeEventListener('error', onError); };
  player.addEventListener('error', onError);
}

function openEpisode(anime, seasonNumber, episodeIndex){
  try {
    if(!anime) return;
    const season = (anime.seasons||[]).find(s=>s.number===seasonNumber);
    const episode = season && Array.isArray(season.episodes) ? season.episodes[episodeIndex] : null;
    const player = document.getElementById('anime-player'); if(!player) return;
    if(episode && episode.videoUrl){ player.src = episode.videoUrl; onVideoSetSource(player); }
    const bannerEl = document.querySelector('.video-banner'); const bannerUrl = anime.banner || anime.cover || 'images/bg-default.jpg';
    if (bannerEl) bannerEl.style.backgroundImage = `url('${bannerUrl}')`;
    if (episode && episode.opening && typeof episode.opening.start === 'number' && typeof episode.opening.end === 'number') window.updateOpeningData && window.updateOpeningData({start: episode.opening.start, end: episode.opening.end});
    else window.updateOpeningData && window.updateOpeningData(null);
    try { const saved = window.animeDB && window.animeDB.getContinueWatching && window.animeDB.getContinueWatching()[String(anime.id)]; if (saved && typeof saved.time === 'number') player.currentTime = saved.time; } catch(e){}
    const sl = document.getElementById('current-season-label'), elb = document.getElementById('current-episode-label');
    if (sl) sl.textContent = `Temporada ${seasonNumber}`; if (elb) elb.textContent = `Episódio ${episodeIndex+1}${episode && episode.title ? ' — '+episode.title : ''}`;
    player.play().catch(()=>{});
  } catch(e){ console.error('openEpisode error', e); }
}
window.openEpisode = openEpisode;

window.addEventListener('animeDataLoaded', ()=> {
  try { if (typeof loadAnimeSection === 'function') loadAnimeSection('anime'); } catch(e){}
  try { if (window.animeDB && typeof renderContinueWatchingGrid === 'function') renderContinueWatchingGrid(animeDB.getContinueWatching(),'continue-watching-grid'); } catch(e){}
  try { if (typeof bindProfileModalControls === 'function') bindProfileModalControls(); } catch(e){}
  try { if (typeof renderMusicLibrary === 'function' && window.animeDB) renderMusicLibrary(window.animeDB.musicLibrary); } catch(e){}
});
