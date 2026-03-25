/*
 * js/music-player.js
 * Canonical music playback core.
 *
 * Responsibilities:
 * - Maintain a singleton <audio> element (#music-playing-audio).
 * - Expose window.playMusicUrl(url) as the shared playback entrypoint.
 * - Centralize playback error/timeout UI used by the music experience.
 *
 * Architecture note:
 * - UI-specific enhancements must live in dedicated plugins (ex.:
 *   js/music-player-mini-plugin.js).
 * - Do not add parallel "music-player-*.js" core implementations.
 */
(function(){
  function getMusicAudio(){
    let a = document.getElementById('music-playing-audio');
    if (a) return a;

    // remove other audio elements created by previous code
    document.querySelectorAll('audio').forEach(el => { if (el.id !== 'music-playing-audio') try { el.pause(); el.remove(); } catch(e){} });

    a = document.createElement('audio');
    a.id = 'music-playing-audio';
    a.preload = 'metadata';
    a.removeAttribute('crossorigin');
    a.style.display = 'none';
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

    audio.addEventListener('playing', function _on(){
      clearMusicError();
      musicLoadTimeout && clearTimeout(musicLoadTimeout);
      audio.removeEventListener('playing', _on);
    });
  }

  function showMusicError(msg){
    let el = document.getElementById('music-error-container');
    if(!el){
      el = document.createElement('div');
      el.id = 'music-error-container';
      Object.assign(el.style,{
        position:'fixed',
        bottom:'12px',
        left:'50%',
        transform:'translateX(-50%)',
        background:'rgba(0,0,0,0.8)',
        color:'#fff',
        padding:'8px 12px',
        borderRadius:'6px',
        zIndex:100000
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }

  function clearMusicError(){
    const el = document.getElementById('music-error-container');
    if(el) el.remove();
    musicLoadTimeout && clearTimeout(musicLoadTimeout);
    musicLoadTimeout = null;
  }

  // renderMusicLibrary is handled by js/music.js (grouping/section rendering).
  // This file intentionally owns only playback concerns.

  window.playMusicUrl = playMusicUrl;
})();
