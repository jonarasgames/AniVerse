document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const player = document.getElementById('anime-player'), container = document.getElementById('video-player-container');
  if (!player || !container) return;
  const button = document.createElement('button'); button.id = 'episode-picker-toggle'; button.type = 'button'; button.className = 'btn-icon'; button.title = 'Temporadas e episódios'; button.setAttribute('aria-label', button.title); button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<i class="fas fa-list" aria-hidden="true"></i>';
  document.getElementById('fullscreen-btn').before(button);
  const dialog = document.createElement('dialog'); dialog.className = 'episode-picker'; dialog.id = 'episode-picker'; dialog.setAttribute('aria-labelledby', 'episode-picker-title');
  dialog.innerHTML = `<header><h2 id="episode-picker-title">Temporadas e episódios</h2><button type="button" id="picker-close" aria-label="Fechar lista">×</button></header><label>Temporada<select id="picker-season"></select></label><p id="picker-hint"></p><div id="picker-list"></div>`;
  document.body.appendChild(dialog);
  const el = id => dialog.querySelector(`#${id}`);
  let manifest = { entries:{} }, manifestRequest = null;
  const pictures = new Map(), queued = new Set(), queue = [];
  let preloading = false;
  const isFullscreen = () => document.fullscreenElement === container || document.webkitFullscreenElement === container || container.classList.contains('is-fullscreen');
  const safeUrl = url => typeof url === 'string' && (/^https?:\/\//i.test(url) || /^(images|assets|\/)/.test(url)) ? url : '';
  function imageUrl(episode,key) {
    const provided = safeUrl(episode.thumbnail || episode.previewImage || episode.image);
    const entry = manifest.entries[key], source = episode.videoUrl || episode.sources?.[0]?.url;
    return provided || (entry?.source === source ? safeUrl(entry.image) : '');
  }
  function updatePicture(picture,episode,key,index) {
    const url = imageUrl(episode,key);
    if (picture.dataset.previewUrl === url && picture.childElementCount) return;
    picture.dataset.previewUrl = url; picture.replaceChildren();
    if (url) {
      const image = new Image(); image.alt = `Cena do episódio ${index + 1}`; image.width = 240; image.height = 135; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => { image.remove(); const label=document.createElement('small'); label.textContent='Prévia indisponível'; picture.appendChild(label); },{once:true});
      image.src=url; picture.appendChild(image);
    } else {
      const label=document.createElement('small'); label.textContent=manifest.generating ? 'Preparando PNG…' : 'Prévia indisponível'; picture.appendChild(label);
    }
  }
  function loadManifest() {
    if (manifestRequest) return manifestRequest;
    manifestRequest=fetch('episode-previews.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{
      if(data?.entries && typeof data.entries==='object') manifest=data;
      for(const [picture,item] of pictures) updatePicture(picture,...item);
    }).catch(()=>{}).finally(()=>{manifestRequest=null;});
    return manifestRequest;
  }
  function schedulePreload() {
    if (preloading || !queue.length || document.hidden) return;
    preloading=true;
    const start=async()=>{
      while(queue.length && !document.hidden) {
        const url=queue.shift();
        await new Promise(resolve=>{const image=new Image(); image.decoding='async'; image.fetchPriority='low'; const timer=setTimeout(resolve,5000); image.onload=image.onerror=()=>{clearTimeout(timer);resolve();}; image.src=url;});
      }
      preloading=false;
    };
    if(window.requestIdleCallback) requestIdleCallback(start,{timeout:2500}); else setTimeout(start,500);
  }
  async function preloadSeason(refresh=true) {
    if(refresh) await loadManifest();
    const anime=window.currentAnime, season=anime?.seasons?.find(season=>season.number===window.currentWatchingAnime?.season);
    const episodes=season?.episodes || [];
    const limit=navigator.connection?.saveData?4:episodes.length;
    for(const [index,episode] of episodes.slice(0,limit).entries()) {
      const url=imageUrl(episode,`${anime.id}/${season.number}/${index}`);
      if(url && !queued.has(url)) {queued.add(url);queue.push(url);}
    }
    schedulePreload();
  }
  function preview(picture,episode,key,index) { pictures.set(picture,[episode,key,index]); updatePicture(picture,episode,key,index); }
  function render() {
    pictures.clear(); const list = el('picker-list'); list.replaceChildren();
    loadManifest();
    const anime = window.currentAnime, season = anime?.seasons?.find(s => s.number === Number(el('picker-season').value));
    el('picker-hint').textContent = window.watchParty?.active && !window.watchParty.isHost ? 'A escolha será sugerida ao anfitrião.' : 'Selecione um episódio.';
    for (const [index, episode] of (season?.episodes || []).entries()) {
      const item = document.createElement('button'); item.type = 'button'; item.className = 'picker-episode';
      const picture = document.createElement('div'); picture.className = 'picker-picture';
      preview(picture, episode, `${anime.id}/${season.number}/${index}`, index);
      const text = document.createElement('div'), title = document.createElement('strong'), sub = document.createElement('span');
      title.textContent = `${index + 1}. ${episode.title || `Episódio ${index + 1}`}`;
      sub.textContent = episode.description || (Number.isFinite(Number(episode.duration)) ? `${Math.round(Number(episode.duration)/60)} min` : '');
      const current = window.currentWatchingAnime;
      if (String(current?.id) === String(anime.id) && current.season === season.number && current.episode === index + 1) { item.classList.add('is-current'); item.setAttribute('aria-current','true'); sub.textContent = 'Episódio atual'; }
      text.append(title, sub); item.append(picture, text); item.addEventListener('click', () => { window.openEpisode(anime, season.number, index); dialog.close(); }); list.appendChild(item);
    }
    if (!list.childElementCount) list.textContent = 'Nenhum episódio disponível.';
  }
  window.openEpisodePicker = () => {
    if (!isFullscreen()) return;
    if (dialog.parentElement !== container) container.appendChild(dialog);
    const seasons = el('picker-season'); seasons.replaceChildren();
    for (const season of window.currentAnime?.seasons || []) { const option = document.createElement('option'); option.value = season.number; option.textContent = season.name || `Temporada ${season.number}`; seasons.appendChild(option); }
    seasons.value = String(window.currentWatchingAnime?.season || 1);
    if (!dialog.open) dialog.showModal(); render();
  };
  function syncVisibility() { button.hidden = !isFullscreen(); if (button.hidden && dialog.open) dialog.close(); }
  document.addEventListener('fullscreenchange',syncVisibility); document.addEventListener('webkitfullscreenchange',syncVisibility);
  new MutationObserver(syncVisibility).observe(container,{attributes:true,attributeFilter:['class']}); syncVisibility();
  button.addEventListener('click', () => window.openEpisodePicker()); el('picker-close').addEventListener('click', () => dialog.close()); el('picker-season').addEventListener('change',render);
  dialog.addEventListener('close',()=>pictures.clear()); dialog.addEventListener('keydown',event=>event.stopPropagation());
  window.addEventListener('aniverse:episode-opened',()=>preloadSeason());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) schedulePreload();});
  setInterval(()=>{if(manifest.generating && !document.hidden && window.currentWatchingAnime) preloadSeason();},15000);
  preloadSeason();
});
