/* js/music-player.js - singleton audio + renderMusicLibrary */
(function(){
  function getMusicAudio(){
    let a = document.getElementById('music-playing-audio');
    if (a) return a;
    // remove other audio elements created by previous code
    document.querySelectorAll('audio').forEach(el => { if (el.id !== 'music-playing-audio') try { el.pause(); el.remove(); } catch(e){} });
    a = document.createElement('audio'); a.id='music-playing-audio'; a.preload='metadata'; a.crossOrigin='anonymous'; a.style.display='none';
    document.body.appendChild(a);
    a.addEventListener('error', ()=> showMusicError('Erro ao reproduzir a faixa.'));
    a.addEventListener('playing', ()=> clearMusicError());
    return a;
  }

  let musicLoadTimeout = null;
  function playMusicUrl(url){
    if (!url) return;
    const audio = getMusicAudio();
    try { audio.pause(); } catch(e){}
    audio.src = url;
    audio.load();
    musicLoadTimeout && clearTimeout(musicLoadTimeout);
    musicLoadTimeout = setTimeout(()=> {
      if (audio.readyState < 3 && !audio.paused) showMusicError('Tempo de carregamento excedido. Tente novamente.');
    }, 15000);
    audio.play().catch(err => {
      console.warn('audio.play failed', err);
      showMusicError('Clique para tentar reproduzir a música.');
    });
    audio.addEventListener('playing', function _on(){ clearMusicError(); musicLoadTimeout && clearTimeout(musicLoadTimeout); audio.removeEventListener('playing', _on); });
  }

  function showMusicError(msg){ let el=document.getElementById('music-error-container'); if(!el){ el=document.createElement('div'); el.id='music-error-container'; Object.assign(el.style,{position:'fixed',bottom:'12px',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.8)',color:'#fff',padding:'8px 12px',borderRadius:'6px',zIndex:100000}); document.body.appendChild(el);} el.textContent=msg; }
  function clearMusicError(){ const el=document.getElementById('music-error-container'); if(el) el.remove(); musicLoadTimeout && clearTimeout(musicLoadTimeout); musicLoadTimeout=null; }

  window.renderMusicLibrary = function(musicLibrary){
    const grid = document.getElementById('music-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (musicLibrary.themes || []).forEach(theme => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.innerHTML = `
        <div class="music-cover">
          <img src="${theme.cover || 'images/bg-default.jpg'}" alt="${theme.title}">
        </div>
        <div class="music-info">
          <div class="music-title">${theme.title}</div>
          <div class="music-artist">${theme.artist || ''}</div>
          <div class="music-anime">${theme.anime || ''}</div>
        </div>
      `;
      card.addEventListener('click', ()=> playMusicUrl(theme.audio));
      grid.appendChild(card);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('animeDataLoaded', () => {
      try { if (window.animeDB && window.animeDB.musicLibrary) renderMusicLibrary(window.animeDB.musicLibrary); } catch(e) {}
    });
  });

  window.playMusicUrl = playMusicUrl;
})();
