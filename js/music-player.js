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
  const DIRECT_AUDIO_PATTERN = /\.(mp3|m4a|aac|ogg|wav|flac|opus)(\?|$)/i;

  function diagnoseMusicUrl(url){
    const value = String(url || '').trim();
    if (!value) return { ok:false, reason:'invalid_url', userMessage:'URL da música está vazia ou inválida.' };
    let parsed;
    try { parsed = new URL(value, window.location.href); } catch(_) {
      return { ok:false, reason:'invalid_url', userMessage:'URL da música inválida. Verifique o link informado.' };
    }

    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) {
      return { ok:false, reason:'unsupported_protocol', userMessage:'Formato de link não suportado para reprodução.' };
    }

    const lowerHost = parsed.hostname.toLowerCase();
    const lowerPath = parsed.pathname.toLowerCase();
    const likelyHtmlPage =
      ['youtube.com','youtu.be','music.youtube.com','open.spotify.com','soundcloud.com','drive.google.com']
        .some(host => lowerHost === host || lowerHost.endsWith(`.${host}`)) ||
      (/\/(watch|playlist|album|artist|track|file|view)\b/.test(lowerPath) && !DIRECT_AUDIO_PATTERN.test(lowerPath));

    return {
      ok: true,
      url: parsed.toString(),
      isCrossOrigin: parsed.origin !== window.location.origin,
      isLikelyDirectAudio: DIRECT_AUDIO_PATTERN.test(`${lowerPath}${parsed.search}`),
      likelyHtmlPage
    };
  }

  async function probeMusicUrl(url){
    const diagnostics = diagnoseMusicUrl(url);
    if (!diagnostics.ok) return diagnostics;
    if (diagnostics.url.startsWith('blob:') || diagnostics.url.startsWith('data:')) return diagnostics;
    try {
      const response = await fetch(diagnostics.url, {
        method: 'HEAD',
        mode: diagnostics.isCrossOrigin ? 'cors' : 'same-origin',
        cache: 'no-store',
        credentials: 'omit'
      });
      if (response.status === 404) return { ...diagnostics, ok:false, reason:'http_404', userMessage:'Arquivo de áudio não encontrado (HTTP 404).' };
      if (!response.ok) return { ...diagnostics, ok:false, reason:'http_error', userMessage:`Servidor retornou erro HTTP ${response.status} ao verificar o áudio.` };
      return diagnostics;
    } catch(_) {
      return { ...diagnostics, reason:'head_blocked' };
    }
  }

  function getPlaybackMessage(error, diagnostics){
    if (error?.name === 'NotAllowedError') return 'Reprodução bloqueada pelo navegador. Toque no player para iniciar.';
    if (diagnostics?.reason === 'http_404') return 'Arquivo de áudio não encontrado (HTTP 404).';
    if (!diagnostics?.ok) return diagnostics?.userMessage || 'URL da música inválida.';
    if (diagnostics?.likelyHtmlPage || (!diagnostics?.isLikelyDirectAudio && error?.name === 'NotSupportedError')) {
      return 'Esse link não parece ser um arquivo de áudio direto (.mp3, .m4a, etc).';
    }
    if (error?.name === 'NotSupportedError') return 'Formato de áudio não suportado ou fonte inválida.';
    return 'Clique para tentar reproduzir a música.';
  }

  function getMusicAudio(){
    let a = document.getElementById('music-playing-audio');
    if (a) return a;

    // remove other audio elements created by previous code
    document.querySelectorAll('audio').forEach(el => { if (el.id !== 'music-playing-audio') try { el.pause(); el.remove(); } catch(e){} });
    a = document.createElement('audio'); a.id='music-playing-audio'; a.preload='metadata'; a.removeAttribute('crossorigin'); a.style.display='none';
    document.body.appendChild(a);

    a.addEventListener('error', ()=> showMusicError('Erro ao reproduzir a faixa.'));
    a.addEventListener('playing', ()=> clearMusicError());
    return a;
  }

  let musicLoadTimeout = null;
  async function playMusicUrl(url){
    if (!url) return;
    const audio = getMusicAudio();
    const diagnostics = await probeMusicUrl(url);
    if (!diagnostics.ok) {
      showMusicError(diagnostics.userMessage || 'URL da música inválida.');
      return;
    }
    if (diagnostics.likelyHtmlPage) {
      showMusicError('Aviso: link pode não ser áudio direto. Tentando reproduzir...');
    }

    try { audio.pause(); } catch(e){}
    audio.src = url;
    audio.load();

    musicLoadTimeout && clearTimeout(musicLoadTimeout);
    musicLoadTimeout = setTimeout(()=> {
      if (audio.readyState < 3 && !audio.paused) showMusicError('Tempo de carregamento excedido. Tente novamente.');
    }, 15000);

    audio.play().catch(err => {
      console.warn('audio.play failed', err);
      showMusicError(getPlaybackMessage(err, diagnostics));
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
