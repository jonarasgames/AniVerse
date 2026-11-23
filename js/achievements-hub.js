(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pad = value => String(value).padStart(2, '0');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const shapes = {
    family: '<path d="m17 54 43-35 43 35M29 48v52h62V48"/><circle cx="48" cy="61" r="8"/><circle cx="73" cy="61" r="8"/><path d="M34 90c0-21 29-21 29 0m-6 0c0-21 29-21 29 0"/>',
    ship: '<path d="M25 71h72L84 88H39Z" fill="currentColor"/><path d="M60 19v51M35 70h52"/><path d="M55 26 32 61h23Zm10 8v27h24Z" fill="currentColor" opacity=".8"/><path d="M23 96q12-8 24 0t24 0 24 0"/>',
    compass: '<circle cx="60" cy="60" r="35"/><circle cx="60" cy="60" r="28" opacity=".4"/><path d="m75 43-9 25-24 10 10-25Z" fill="currentColor"/><path d="m60 15 0 9m0 72v9M15 60h9m72 0h9"/>',
    gem: '<path d="m25 43 17-18h36l17 18-35 52Z" fill="currentColor" opacity=".2"/><path d="m25 43 17-18h36l17 18-35 52Zm0 0h70M42 25l-1 18 19 52 19-52-1-18M41 43l19-18 19 18"/>',
    planet: '<circle cx="60" cy="60" r="28" fill="currentColor" opacity=".25"/><circle cx="60" cy="60" r="28"/><ellipse cx="60" cy="60" rx="49" ry="13" transform="rotate(-30 60 60)"/><path d="m26 23 3-6 3 6 6 3-6 3-3 6-3-6-6-3Z" fill="currentColor"/>',
    moon: '<path d="M75 23a37 37 0 1 0 22 53A35 35 0 0 1 75 23Z" fill="currentColor" opacity=".3"/><path d="M75 23a37 37 0 1 0 22 53A35 35 0 0 1 75 23Z"/><path d="m85 31 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="currentColor"/>',
    flame: '<path d="M61 17c7 23 29 28 29 51a30 30 0 0 1-60 0c0-16 10-25 16-29-1 12 2 18 7 21 10-14 11-27 8-43Z" fill="currentColor" opacity=".3"/><path d="M61 17c7 23 29 28 29 51a30 30 0 0 1-60 0c0-16 10-25 16-29-1 12 2 18 7 21 10-14 11-27 8-43Z"/><path d="M61 61c17 16 14 28-1 34-15-6-16-18 1-34Z" fill="currentColor"/>',
    leaf: '<path d="M94 23c-49-7-81 18-64 53 35 18 61-5 64-53Z" fill="currentColor" opacity=".25"/><path d="M94 23c-49-7-81 18-64 53 35 18 61-5 64-53ZM24 96l56-57M44 74l-2-21m2 21 23 1M59 59l-1-17m1 17 20-2"/>',
    chip: '<rect x="32" y="32" width="56" height="56" rx="10" fill="currentColor" opacity=".2"/><rect x="32" y="32" width="56" height="56" rx="10"/><path d="M47 17v15m26-15v15M47 88v15m26-15v15M17 47h15m-15 26h15m56-26h15M88 73h15"/><path d="m59 42-12 21h14l-3 16 15-23H59Z" fill="currentColor"/>',
    trophy: '<path d="M39 25h42v26a21 21 0 0 1-42 0ZM39 32H24v12c0 15 8 22 21 22m36-34h15v12c0 15-8 22-21 22M60 73v20M44 97h32"/><path d="m60 34 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="currentColor"/>'
  };

  function art(icon, cls = '') {
    return `<svg class="hub-art ${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[icon] || shapes.gem}</svg>`;
  }

  function progress(value, max, label, extra = '') {
    const pct = Math.min(100, max ? value / max * 100 : 0);
    return `<div class="hub-progress ${extra}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}"><span style="width:${pct}%"></span></div>`;
  }

  function init() {
    const modal = $('achievements-modal');
    const engine = window.collectionEngine;
    const achievements = window.achievementEngine;
    if (!modal || !engine || !achievements) return;

    const rarities = window.collectionRarities || {};
    const dialog = $('hub-pack-dialog');
    const viewer = $('hub-card-viewer');
    let tab = 'achievements';
    let filter = 'all';
    let selectedSeason = null;
    let page = 0;
    let returnFocus = null;
    let bodyOverflow = '';
    let closeTimer = 0;
    let noticeTimer = 0;
    let monthTimer = 0;
    let revealTimers = [];
    let focusedCard = null;
    let packResult = null;
    let packProfile = null;
    let viewerKey = null;
    let viewerReturnFocus = null;

    // ------------------------------------------------------------------
    // Áudio: música em loop, ducking dos efeitos e fade com reverb
    // ------------------------------------------------------------------
    const PACK_MUSIC_URL = 'https://media.ffycdn.net/eu/supercell/MMEcCXnkjEpz8g353kee.wav?width=1024&format=mp3';
    const PACK_SFX_URLS = {
      incoming: 'https://media.ffycdn.net/eu/supercell/Rp2VDXmsQBAmWWuawcKG.ogg?width=1024&format=mp3',
      common: 'https://media.ffycdn.net/eu/supercell/c7t6bnYarrkqtkr77uon.ogg?width=1024&format=mp3',
      rare: 'https://media.ffycdn.net/eu/supercell/oXFZGhPEUvyLeX6btdJT.ogg?width=1024&format=mp3',
      epic: 'https://media.ffycdn.net/eu/supercell/zPzLedKz3SEzVbMhQ9ZT.ogg?width=1024&format=mp3',
      legendary: 'https://media.ffycdn.net/eu/supercell/dctGTKKJtb6QHvzisadV.ogg?width=1024&format=mp3'
    };
    const MUSIC_VOLUME = 0.42;
    const DUCK_VOLUME = 0.085;
    let packAudio = null;
    let activeSfx = new Set();
    let sfxCount = 0;
    let audioContext, audioMaster, reverbNode, reverbGain;
    let audioActive = false;
    const sfxBuffers = new Map(), sfxLoads = new Map(), sfxPool = new Map(), bufferEffects = new Set();
    function ensureAudioContext() {
      if (audioContext) return audioContext;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audioContext = new Context();
      audioMaster = audioContext.createGain(); audioMaster.connect(audioContext.destination);
      reverbNode = audioContext.createConvolver();
      reverbGain = audioContext.createGain(); reverbGain.gain.value = .16;
      const length = Math.floor(audioContext.sampleRate * 1.3);
      const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
      }
      reverbNode.buffer = impulse;
      reverbNode.connect(reverbGain); reverbGain.connect(audioMaster);
      return audioContext;
    }
    function roomAudio(url) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous'; audio.preload = 'auto'; audio.src = url;
      try {
        const context = ensureAudioContext();
        if (context) {
          const source = context.createMediaElementSource(audio);
          source.connect(audioMaster); source.connect(reverbNode);
          context.resume().catch(() => {});
        }
      } catch (_) {}
      return audio;
    }
    function loadSfx(url) {
      if (sfxLoads.has(url)) return sfxLoads.get(url);
      const context = ensureAudioContext();
      if (!context) {
        const audio = roomAudio(url); sfxPool.set(url, audio); audio.load();
        return Promise.resolve(null);
      }
      const promise = fetch(url, {mode:'cors', credentials:'omit'})
        .then(response => { if (!response.ok) throw new Error('audio'); return response.arrayBuffer(); })
        .then(bytes => context.decodeAudioData(bytes))
        .then(buffer => { sfxBuffers.set(url, buffer); return buffer; })
        .catch(() => { if (!sfxPool.has(url)) { const audio = roomAudio(url); audio.load(); sfxPool.set(url, audio); } return null; });
      sfxLoads.set(url, promise);
      return promise;
    }
    function primeSfx() {
      if (!soundOn()) return;
      try { ensureAudioContext()?.resume().catch(() => {}); Object.values(PACK_SFX_URLS).forEach(loadSfx); } catch (_) {}
    }


    function soundOn() {
      return achievements.getSnapshot?.()?.soundEnabled !== false;
    }

    function ramp(audio, target, duration = 300, done) {
      if (!audio) return;
      cancelAnimationFrame(audio.__acRamp || 0);
      const from = Number(audio.volume) || 0;
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now - start) / Math.max(1, duration));
        try { audio.volume = clamp(from + (target - from) * t, 0, 1); } catch (_) {}
        if (t < 1) audio.__acRamp = requestAnimationFrame(step);
        else { audio.__acRamp = 0; done?.(); }
      };
      audio.__acRamp = requestAnimationFrame(step);
    }

    function playPackMusic(restart = false) {
      if (!soundOn()) return;
      audioActive = true;
      if (audioMaster) { audioMaster.gain.cancelScheduledValues(audioContext.currentTime); audioMaster.gain.setValueAtTime(1, audioContext.currentTime); audioContext.resume().catch(() => {}); }
      try {
        if (!packAudio) {
          packAudio = roomAudio(PACK_MUSIC_URL);
          packAudio.preload = 'auto';
        }
        packAudio.loop = true;
        if (restart) packAudio.currentTime = 0;
        if (packAudio.paused) {
          packAudio.volume = 0;
          packAudio.play().catch(() => {});
        }
        ramp(packAudio, sfxCount ? DUCK_VOLUME : MUSIC_VOLUME, 650);
      } catch (_) {}
    }

    function duckMusic() {
      if (packAudio && !packAudio.paused) ramp(packAudio, DUCK_VOLUME, 150);
    }

    function restoreMusic() {
      if (audioActive && soundOn() && packAudio && !packAudio.paused && sfxCount === 0) ramp(packAudio, MUSIC_VOLUME, 480);
    }

    function playSfx(url, delayMs = 0) {
      if (!url || !soundOn() || !audioActive) return;
      const buffer = sfxBuffers.get(url);
      if (buffer && audioContext) {
        const source = audioContext.createBufferSource(), gain = audioContext.createGain();
        source.buffer = buffer; gain.gain.value = .9;
        source.connect(gain); gain.connect(audioMaster); gain.connect(reverbNode);
        const effect = {source, gain}; bufferEffects.add(effect);
        sfxCount = activeSfx.size + bufferEffects.size; duckMusic();
        source.onended = () => { bufferEffects.delete(effect); sfxCount = activeSfx.size + bufferEffects.size; source.disconnect(); gain.disconnect(); restoreMusic(); };
        // Skip leading silence so the audible transient follows the animation clock.
        const samples = buffer.getChannelData(0); let onset = 0;
        while (onset < Math.min(samples.length, buffer.sampleRate * .25) && Math.abs(samples[onset]) < .002) onset++;
        source.start(audioContext.currentTime + delayMs / 1000, Math.max(0, onset / buffer.sampleRate - .005));
        return;
      }
      const start = () => {
        if (!audioActive || !soundOn()) return;
        const sfx = sfxPool.get(url) || roomAudio(url);
        sfxPool.set(url,sfx); sfx.currentTime = 0; sfx.volume = .9;
        activeSfx.add(sfx); sfxCount = activeSfx.size + bufferEffects.size; duckMusic();
        let finished = false;
        const finish = () => { if (finished) return; finished = true; activeSfx.delete(sfx); sfxCount = activeSfx.size + bufferEffects.size; restoreMusic(); };
        sfx.addEventListener('ended',finish,{once:true});sfx.addEventListener('error',finish,{once:true});sfx.play().catch(finish);
      };
      if (delayMs) revealTimers.push(setTimeout(start,delayMs)); else start();
    }

    function stopAllAudio({ reverb = false } = {}) {
      audioActive = false;
      $('achievements-audio')?.pause();
      const tracks = [packAudio, ...activeSfx].filter(Boolean);
      for (const audio of tracks) {
        cancelAnimationFrame(audio.__acRamp || 0);
        if (reverb && soundOn()) ramp(audio, 0, 500, () => { audio.pause(); audio.currentTime = 0; });
        else { audio.volume = 0; audio.pause(); audio.currentTime = 0; }
      }
      if (!reverb && audioMaster) {
        audioMaster.gain.cancelScheduledValues(audioContext.currentTime);
        audioMaster.gain.setValueAtTime(0, audioContext.currentTime);
      }
      for (const effect of bufferEffects) {
        const now = audioContext.currentTime;
        effect.gain.gain.cancelScheduledValues(now);
        effect.gain.gain.setValueAtTime(effect.gain.gain.value,now);
        effect.gain.gain.linearRampToValueAtTime(0, now + (reverb ? .5 : .01));
        try { effect.source.stop(now + (reverb ? .51 : .02)); } catch (_) {}
      }
      activeSfx.clear(); bufferEffects.clear(); sfxCount = 0;
    }

    function playAchievementSound(url) {
      if (!url || !soundOn()) return;
      const audio = $('achievements-audio');
      if (!audio) return;
      try {
        audio.src = url;
        audio.volume = 0.75;
        audio.play().catch(() => {});
      } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Helpers de renderização
    // ------------------------------------------------------------------
    function notice(text, error = false) {
      const node = $('hub-notice');
      if (!node) return;
      node.textContent = text;
      node.hidden = false;
      node.classList.toggle('is-error', error);
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { node.hidden = true; }, 6500);
    }

    function run(action) {
      try {
        return action();
      } catch (error) {
        notice(error?.message || 'Não foi possível salvar. Verifique o armazenamento do navegador.', true);
        return null;
      }
    }

    function book() {
      return engine.snapshot(selectedSeason || undefined);
    }

    function decorate(card, key) {
      if (window.cardStudio?.decorate) return window.cardStudio.decorate(card, key);
      return { ...card, image: card.renderSrc || '', imageX: 50, imageY: 50, finish: '' };
    }

    function photoMarkup(card) {
      if (window.cardStudio?.photo) return window.cardStudio.photo(card);
      return `<div class="card-photo ${card.image ? 'has-photo' : ''}" style="--photo-x:${card.imageX || 50}%;--photo-y:${card.imageY || 50}%">${card.image ? `<img src="${esc(card.image)}" alt="${esc(card.name)}" loading="lazy" decoding="async" data-no-retry="true">` : '<span class="card-photo-fallback"><span>✦</span><small>Personagem</small></span>'}</div>`;
    }

    function cardMarkup(card, { key = null, tilt = false, reveal = false } = {}) {
      const decorated = decorate(card, key || book().key);
      const rarity = rarities[decorated.rarity] || { name: decorated.rarity };
      const finish = decorated.finish || window.cardStudio?.FINISHES?.[decorated.rarity] || '';
      return `<div class="sticker-art rarity-${decorated.rarity} ${decorated.pasted ? 'is-pasted' : ''}" ${tilt ? 'data-card-tilt' : ''}>
        <div class="sticker-art-top"><span>ANV / ${pad(decorated.number)}</span><span>${decorated.rarity === 'legendary' ? '✦✦✦' : '✦'}</span></div>
        ${photoMarkup(decorated)}
        <div class="sticker-caption"><small>${esc(decorated.group)}</small><strong>${esc(decorated.name)}</strong><span class="sticker-rarity">${esc(rarity.name)} · ${esc(finish)}</span></div>
        <span class="card-finish-light" aria-hidden="true"></span>
      </div>`;
    }

    function cardBackMarkup() {
      return `<div class="ac-card-identity" aria-label="Verso AniVerse"><div class="ac-back-orbits" aria-hidden="true"></div><img src="images/logo.png" alt="" draggable="false"><strong>Ani<span>Verse</span></strong><small>CLUBE DE CONQUISTAS</small><span class="ac-back-edition">COLEÇÃO OFICIAL</span></div>`;
    }

    function seasonHero(collection, content) {
      return `<section class="ac-season" aria-label="${esc(collection.name)}">
        <div class="ac-season-artwork" hidden>
          <img class="ac-season-background" src="${esc(collection.bannerSrc)}" data-fallback="${esc(collection.bannerFallback || '')}" alt="" decoding="async" data-no-retry="true">
          <img class="ac-season-logo" src="${esc(collection.logoSrc)}" data-fallback="${esc(collection.logoFallback || '')}" alt="${esc(collection.name)}" width="640" height="320" loading="eager" data-no-retry="true">
        </div>
        <div class="ac-season-hero" style="--season:${collection.color}">${content}</div>
      </section>`;
    }

    function packArt() {
      return `<div class="ac-pack-illustration" aria-hidden="true">
        <div class="ac-pack-object"><span>ANIVERSE</span><strong>ANV<br>✦</strong><small>3 CARTAS</small></div>
      </div>`;
    }

    function setTab(next, focus = false) {
      tab = next;
      const tabs = [...modal.querySelectorAll('[data-hub-tab]')];
      tabs.forEach(button => {
        const active = button.dataset.hubTab === next;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        const panel = $(`hub-panel-${button.dataset.hubTab}`);
        if (panel) panel.hidden = !active;
        if (active && focus) button.focus();
      });
      const nav = modal.querySelector('.ac-tabs');
      if (nav) nav.dataset.active = next;
      if (next === 'album') prepareAlbum();
      render();
    }

    function updateFab() {
      const snapshot = achievements.getSnapshot();
      const collection = engine.snapshot();
      const packs = collection.archive.reduce((total, key) => total + engine.snapshot(key).packs, 0);
      const unseen = snapshot?.unseenCount || 0;
      const fab = $('achievements-fab');
      if (fab) {
        fab.style.display = 'flex';
        fab.setAttribute('aria-label', `Conquistas e álbum${packs ? `, ${packs} pacotes disponíveis` : ''}`);
      }
      const count = $('achievements-fab-count');
      if (count) {
        count.textContent = unseen + packs;
        count.style.display = unseen + packs ? 'inline-flex' : 'none';
      }
      const dot = modal.ownerDocument.querySelector('.achievements-fab-dot');
      if (dot) dot.style.display = unseen + packs ? 'block' : 'none';
      const packCount = $('hub-pack-count');
      if (packCount) { packCount.textContent = packs; packCount.hidden = !packs; }
      const toast = $('achievements-silent-toast');
      if (toast) toast.style.display = unseen + packs && modal.style.display !== 'flex' ? 'flex' : 'none';
      const toastText = $('achievements-silent-toast-text');
      if (toastText) toastText.textContent = packs ? `${packs} pacote${packs > 1 ? 's' : ''} esperando por você!` : `${unseen} nova${unseen > 1 ? 's' : ''} conquista${unseen > 1 ? 's' : ''}!`;
    }

    // ------------------------------------------------------------------
    // Aba de conquistas
    // ------------------------------------------------------------------
    function renderAchievements(snapshot, collection) {
      const list = $('achievements-list');
      if (!snapshot) {
        if (list) list.innerHTML = '<div class="hub-empty">As conquistas não carregaram. <button type="button" data-action="retry-achievements">Tentar novamente</button></div>';
        return;
      }
      const unlocked = snapshot.items.filter(item => item.unlocked).length;
      const stats = $('achievements-stats');
      if (stats) {
        stats.innerHTML = `
          <div class="ac-stat" data-ac-tilt>
            <span class="ac-stat-icon">${art('trophy')}</span>
            <div><strong>${unlocked}<small>/${snapshot.items.length}</small></strong><span>Conquistas</span></div>
          </div>
          <div class="ac-stat" data-ac-tilt>
            <span class="ac-stat-icon alt">${art('compass')}</span>
            <div><strong>${snapshot.stats.episodesCompleted}</strong><span>Episódios completos</span></div>
          </div>
          <div class="ac-stat" data-ac-tilt>
            <span class="ac-stat-icon alt2">${art('flame')}</span>
            <div><strong>${snapshot.stats.streak}<small>${snapshot.stats.streak === 1 ? ' dia' : ' dias'}</small></strong><span>Sequência atual</span></div>
          </div>`;
      }

      const ordered = [...snapshot.items].sort((a, b) => Number(a.unlocked) - Number(b.unlocked) || b.progressPercent - a.progressPercent);
      const visible = ordered.filter(item => filter === 'all' || (filter === 'unlocked' ? item.unlocked : !item.unlocked));
      if (list) {
        list.innerHTML = visible.map((item, index) => `<article class="ac-ach-card ${item.unlocked ? 'is-unlocked' : 'is-locked'}" data-ac-tilt style="--entry:${Math.min(index, 8)}">
          <div class="ac-ach-top">
            <div class="ac-medal ${item.unlocked ? 'is-earned' : ''}"><img src="${esc(item.icon)}" alt="" loading="lazy" decoding="async"></div>
            <span class="ac-chip ${item.unlocked ? 'is-done' : item.progressPercent >= 50 ? 'is-close' : ''}">${item.unlocked ? '✦ Desbloqueada' : item.progressPercent >= 50 ? 'Em progresso' : `${item.progressPercent}%`}</span>
          </div>
          <h4>${esc(item.name)}</h4>
          <p>${esc(item.desc)}</p>
          <div class="ac-ach-foot">${progress(item.progress, item.goal, item.name)}<small>${item.unlocked ? 'Desbloqueada' : `${item.progress} de ${item.goal} · faltam ${Math.max(0, item.goal - item.progress)}`}</small></div>
        </article>`).join('') || '<div class="hub-empty">Nenhuma conquista neste filtro.</div>';
      }

      const soundToggle = $('achievements-sound-toggle');
      if (soundToggle) soundToggle.checked = snapshot.soundEnabled;

      const preview = $('hub-season-preview');
      if (preview) {
        preview.innerHTML = `<button type="button" class="ac-season-banner" data-action="go-album" style="--season:${collection.color}">
          <span class="ac-season-banner-icon">${art(collection.icon)}</span>
          <span class="ac-season-banner-copy"><span class="hub-eyebrow">${collection.comingSoon ? 'ESTREIA EM NOVEMBRO' : `GALERIA DO MÊS · ${esc(collection.label)}`}</span><strong>${esc(collection.name)}</strong><small>24 figurinhas</small></span>
          <span class="ac-season-banner-cta">${collection.comingSoon ? 'Conhecer →' : 'Abrir galeria →'}</span>
        </button>`;
      }
    }

    // ------------------------------------------------------------------
    // Galeria de figurinhas
    // ------------------------------------------------------------------
    function launchPreview(collection) {
      return seasonHero(collection, `<div class="ac-season-copy"><span class="ac-season-tag">ESTREIA EM 1º DE NOVEMBRO DE 2026</span><h3>${esc(collection.name)}</h3><p>Uma nova aventura chega em novembro: 24 cartas para colecionar e personagens para liberar como avatares.</p><p>A partir da estreia, cada episódio inédito concluído vale 100 pontos. A cada 300 pontos, você ganha um pacote com 3 cartas. Uma nova temporada começa no primeiro dia de cada mês.</p></div><div class="ac-season-emblem">${art(collection.icon)}<span>NOVEMBRO · 2026</span></div>`);
    }

    function slotMarkup(card, collection, index) {
      const rarity = rarities[card.rarity] || { name: card.rarity, cost: 0 };
      const action = card.pasted
        ? ''
        : card.owned
          ? `<button type="button" class="hub-button" data-action="paste" data-id="${card.id}">Colar</button>`
          : `<button type="button" class="ac-craft-button" data-action="craft" data-id="${card.id}" ${collection.fragments < rarity.cost ? 'disabled' : ''}>Criar · ${rarity.cost} fragmentos</button>`;
      const visual = card.owned
        ? `<button type="button" class="ac-card-button" data-action="view" data-id="${card.id}" aria-label="Ver ${esc(card.name)} em tela cheia">${cardMarkup(card, { key: collection.key, tilt: true })}</button>`
        : `<div class="sticker-placeholder rarity-${card.rarity}"><span class="sticker-slot-number">${pad(card.number)}</span><span class="sticker-scene-mark" aria-hidden="true">✦</span><strong>${esc(card.name)}</strong><span class="sticker-rarity">${esc(rarity.name)}</span></div>`;
      return `<article class="hub-sticker-slot ac-slot ${card.owned ? 'is-owned' : 'is-missing'}" data-card="${card.id}" style="--entry:${index}">
        ${visual}
        <div class="ac-slot-action">${action}</div>
      </article>`;
    }

    function upcomingSeason(collection, expanded) {
      const now = new Date();
      const announcement = new Date(2026, 10, 24);
      const launch = new Date(2026, 11, 1);
      if (collection.currentKey !== '2026-11' || now < announcement || now >= launch) return '';
      const next = engine.snapshot('2026-12');
      return `<details class="ac-next-season"${expanded ? ' open' : ''}><summary>Próxima temporada · Em família · Dezembro</summary>${seasonHero(next, '')}<p>24 cartas · A partir de 1º de dezembro</p></details>`;
    }

    function renderAlbum(collection) {
      const host = $('hub-album');
      if (!host) return;
      const previewExpanded = host.querySelector('.ac-next-season')?.open;
      if (collection.comingSoon) {
        host.innerHTML = launchPreview(collection);
        return;
      }

      const category = Math.floor(page / 2);
      const cards = collection.cards.filter(card => card.category === category);
      const groupName = collection.groups[category]?.[0] || 'Página';
      const pasted = collection.pasted.length;
      const days = Math.max(0, Math.ceil((new Date(collection.endsAt) - new Date()) / 86400000));
      const ownedWaiting = Math.max(0, collection.owned.length - pasted);

      host.innerHTML = `<div class="ac-album-toolbar">
          <label class="ac-select"><span>Temporada</span><select id="hub-season-select" aria-label="Selecionar temporada">${collection.archive.map(key => `<option value="${key}" ${key === collection.key ? 'selected' : ''}>${esc(engine.snapshot(key).label)}${key === collection.currentKey ? '' : ' · Arquivo'}</option>`).join('')}</select></label>
          <button type="button" class="ac-text-button" data-action="export-gif" ${collection.owned.length ? '' : 'disabled'}>Exportar GIF ↗</button>
        </div>
        ${seasonHero(collection, `<div class="ac-season-copy"><h3>${esc(collection.name)}</h3></div><div class="ac-season-emblem">${art(collection.icon)}</div>`)}
        <div class="ac-album-summary"><span>${collection.isCurrent ? `${days} dias restantes` : 'Arquivado'}</span><div>${progress(pasted, 24, 'Álbum completo')}<span>${pasted} / 24 coladas${ownedWaiting ? ` · ${ownedWaiting} para colar` : ''}</span></div></div>
        <div class="ac-pack-station">${packArt()}<div class="ac-pack-station-copy"><h3>${collection.packs ? `${collection.packs} pacote${collection.packs > 1 ? 's' : ''}` : 'Próximo pacote'}</h3>${collection.isCurrent ? `${progress(collection.progress, 300, 'Pontos para o próximo pacote')}<span class="ac-tiny">${collection.progress} / 300 pontos</span>` : '<span class="ac-tiny">Pacotes desta temporada</span>'}</div><div class="ac-pack-station-actions"><button type="button" class="hub-button" data-action="open-pack" ${collection.packs ? '' : 'disabled'}>Abrir pacote ↗</button><span class="ac-fragments">${collection.fragments} fragmentos</span></div></div>
        <div class="ac-book-head"><h3 id="album-page-title" tabindex="-1">${esc(groupName)} <small>${cards.filter(card => card.pasted).length} / 8</small></h3></div>
        <div class="ac-category-nav">${collection.groups.map(([name], i) => `<button type="button" data-action="category" data-id="${i}" aria-pressed="${category === i}" class="${category === i ? 'is-active' : ''}">${esc(name)}<span>${collection.cards.filter(c => c.category === i && c.pasted).length}/8</span></button>`).join('')}</div>
        <div class="ac-gallery hub-album-page">${cards.map((card, index) => slotMarkup(card, collection, index)).join('')}</div>
        <div class="ac-page-reward">${art('trophy')}<span>${cards.every(c => c.pasted) ? 'Categoria completa' : 'Prêmios da categoria'}<small>2 selos de página + 1 título</small></span><button type="button" class="ac-text-button" data-action="go-rewards">Ver prêmio ↗</button></div>
        ${upcomingSeason(collection, previewExpanded)}
        <details class="ac-rules"><summary>Como funciona</summary><div><p>Cada episódio inédito concluído dá 100 pontos. A cada 300 pontos, você recebe um pacote de 3 cartas. Uma delas é rara ou melhor.</p><p>Repetidas viram fragmentos: comum 10, rara 20, épica 40 e lendária 80. Use-os para criar cartas. Uma nova temporada começa a cada mês; as anteriores ficam guardadas.</p><p>Complete páginas e categorias para resgatar prêmios. As 24 cartas coladas liberam os personagens como avatares do perfil. Progresso salvo neste navegador.</p><p>Pacotes da temporada atual podem trazer uma carta antiga: os pesos por idade são 40, 35, 30, 25, 20, 15, 10, 8, 6, 4, 2 e 1. Se a soma passar de 100, as chances são ajustadas na mesma proporção. Depois de 12 meses, a temporada sai do sorteio. As outras duas cartas são da temporada atual, incluindo a rara ou melhor. Cada carta vai para seu álbum de origem. Pacotes antigos guardados continuam trazendo só cartas da própria temporada.</p><p>Chances nas duas primeiras cartas: comum 60%, rara 28%, épica 10%, lendária 2%. Na terceira: rara 70%, épica 25%, lendária 5%.</p></div></details>`;
    }

    // ------------------------------------------------------------------
    // Prêmios
    // ------------------------------------------------------------------
    function renderRewards(collection) {
      const host = $('hub-rewards');
      if (!host) return;
      if (collection.comingSoon) {
        host.innerHTML = launchPreview(collection);
        return;
      }
      const claimed = collection.rewards.filter(r => r.claimed).length;
      host.innerHTML = `<div class="ac-rewards-intro"><h3>Prêmios</h3><span>${claimed} de 10 resgatados</span></div>
        <div class="ac-reward-season"><h4>${esc(collection.name)}</h4><span>${esc(collection.label)} · ${claimed}/10 prêmios</span></div>
        <div class="ac-rewards-grid">${collection.rewards.map(reward => `<article class="ac-reward ${reward.claimed ? 'is-claimed' : reward.ready ? 'is-ready' : ''}" data-ac-tilt>
          <span class="ac-reward-kind">${esc(reward.kind)}</span>
          <div class="ac-reward-medal">${art(reward.icon)}</div>
          <h4>${esc(reward.name)}</h4>
          <p>+${reward.fragments} fragmentos${reward.id === 'album' ? `<br><strong class="ac-avatar-prize">24 avatares de personagens</strong><br><small>${reward.ready ? 'Liberados no editor deste perfil ✦' : 'Liberados ao colar a última carta'}</small>` : ''}</p>
          ${reward.claimed
            ? `<button type="button" class="hub-button secondary" data-action="equip" data-id="${reward.id}" ${collection.equipped?.id === reward.id && collection.equipped?.season === collection.key ? 'disabled' : ''}>${collection.equipped?.id === reward.id && collection.equipped?.season === collection.key ? 'Equipado' : 'Equipar'}</button>`
            : `<button type="button" class="hub-button" data-action="claim" data-id="${reward.id}" ${reward.ready ? '' : 'disabled'}>${reward.ready ? 'Resgatar' : reward.id === 'album' ? 'Complete o álbum' : reward.id.startsWith('page') ? 'Complete a página' : 'Complete a categoria'}</button>`}
        </article>`).join('')}</div>
        <div class="ac-showcase"><h3>Seus prêmios resgatados</h3><div>${collection.showcase.map(reward => `<button type="button" class="ac-showcase-badge" data-action="equip-archive" data-id="${reward.id}" data-season="${reward.season}">${art(reward.icon)}<strong>${esc(reward.name)}</strong><small>${esc(reward.season)}</small></button>`).join('') || '<span class="hub-empty">Nenhum prêmio resgatado.</span>'}</div></div>`;
    }

    // ------------------------------------------------------------------
    // Render principal
    // ------------------------------------------------------------------
    function render() {
      updateFab();
      if (modal.style.display !== 'flex') return;
      const collection = book();
      const snapshot = achievements.getSnapshot();
      modal.dataset.season = `${collection.key}:${collection.comingSoon}`;
      modal.dataset.previewDate = new Date().toDateString();
      modal.style.setProperty('--season', collection.color);

      if (tab === 'achievements') renderAchievements(snapshot, collection);
      if (tab === 'album') renderAlbum(collection);
      if (tab === 'rewards') renderRewards(collection);
    }

    function prepareAlbum() {
      window.cardStudio?.load?.();
      if (book().packs > 0) primeSfx();
    }

    function open() {
      if (modal.style.display !== 'flex') {
        returnFocus = document.activeElement;
        bodyOverflow = document.body.style.overflow;
      }
      clearTimeout(closeTimer);
      selectedSeason = null;
      page = 0;
      modal.style.display = 'flex';
      if (tab === 'album') prepareAlbum();
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => modal.classList.add('is-open'));
      render();
      $('close-achievements-modal')?.focus();
      const pending = achievements.drainPendingUnlocks();
      if (pending.length) {
        notice(`${pending.length} conquista(s) desbloqueada(s).`);
        if (pending[0].sound) playAchievementSound(pending[0].sound);
        achievements.markAllSeen();
      }
      clearInterval(monthTimer);
      monthTimer = setInterval(() => {
        const collection = book();
        const seasonChanged = !selectedSeason && `${collection.key}:${collection.comingSoon}` !== modal.dataset.season;
        const dayChanged = new Date().toDateString() !== modal.dataset.previewDate;
        if ((seasonChanged || dayChanged) && !dialog?.open && viewer?.hidden) render();
      }, 30000);
    }

    function close() {
      if (dialog?.open) dialog.close();
      closeViewer(true);
      stopAllAudio({ reverb: true });
      modal.classList.remove('is-open');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (!modal.classList.contains('is-open')) modal.style.display = 'none';
      }, 180);
      document.body.style.overflow = bodyOverflow;
      clearInterval(monthTimer);
      updateFab();
      returnFocus?.focus?.();
    }

    // ------------------------------------------------------------------
    // Abertura do pacote
    // ------------------------------------------------------------------
    function clearRevealTimers() {
      revealTimers.forEach(timer => clearTimeout(timer));
      revealTimers = [];
      focusedCard = null;
    }

    function openPack() {
      const collection = book();
      const draws = run(() => engine.openPack(collection.key));
      if (!draws) return;
      packResult = { key: collection.key, draws };
      packProfile = collection.profileId;

      const cardsEl = $('hub-pack-cards');
      if (cardsEl) {
        cardsEl.innerHTML = draws.map((card, i) => `<button type="button" class="ac-pack-card" data-reveal="${i}" aria-label="Revelar carta ${i + 1}" style="--entry:${i}">
          <span class="ac-flip">
            <span class="ac-face ac-card-back">${cardBackMarkup()}</span>
            <span class="ac-face ac-card-front">${cardMarkup(card, { key: card.season || collection.key, reveal: true })}<span class="ac-draw-note">${card.duplicate ? `Repetida · +${card.fragments} fragmentos` : 'Nova'}${card.legacy ? `<small class="ac-draw-season">${esc(card.seasonLabel)}</small>` : ''}</span></span>
          </span>
        </button>`).join('');
        cardsEl.classList.add('is-sealed');
        cardsEl.classList.remove('is-open');
      }

      const sealedPack = $('hub-pack-open');
      if (sealedPack) {
        sealedPack.hidden = false;
        sealedPack.classList.remove('is-burst');
        sealedPack.disabled = false;
      }
      clearRevealTimers();
      dialog.querySelectorAll('.ac-spark').forEach(node => node.remove());
      dialog.classList.remove('is-booming');
      const status = $('hub-pack-status');
      if (status) status.textContent = 'Toque para abrir.';
      const subtitle = $('hub-pack-subtitle');
      if (subtitle) subtitle.textContent = 'Toque no pacote para abrir.';
      $('hub-paste-pack').disabled = true;
      $('hub-reveal-all').disabled = true;
      dialog.style.setProperty('--season', collection.color);
      if (!dialog.open) dialog.showModal();
      primeSfx();
      playPackMusic(true);
      $('hub-pack-open')?.focus();
    }

    async function burstPack() {
      const sealedPack = $('hub-pack-open');
      const cardsEl = $('hub-pack-cards');
      if (!packResult || !sealedPack || !cardsEl || sealedPack.classList.contains('is-burst')) return;
      if (sealedPack.disabled) return;
      sealedPack.disabled = true;
      const opening = packResult;
      $('hub-pack-status').textContent = 'Preparando abertura…';
      if (soundOn()) {
        const readyAudio = Promise.all([PACK_SFX_URLS.incoming,...packResult.draws.map(card=>PACK_SFX_URLS[card.rarity])].map(loadSfx));
        await Promise.race([readyAudio,new Promise(resolve=>setTimeout(resolve,2500))]);
      }
      if (!dialog.open || packResult !== opening) return;
      playSfx(PACK_SFX_URLS.incoming,680);
      sealedPack.classList.add('is-burst');
      dialog.classList.add('is-booming');
      revealTimers.push(setTimeout(() => dialog.classList.remove('is-booming'), 700));

      const stage = $('hub-pack-stage');
      if (stage) {
        for (let i = 0; i < 22; i++) {
          const spark = document.createElement('span');
          spark.className = 'ac-spark';
          const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.5;
          const distance = 90 + Math.random() * 150;
          spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
          spark.style.setProperty('--ty', `${Math.sin(angle) * distance - 40}px`);
          spark.style.setProperty('--rot', `${Math.random() * 260 - 130}deg`);
          stage.appendChild(spark);
          revealTimers.push(setTimeout(() => spark.remove(), 1100));
        }
      }

      revealTimers.push(setTimeout(() => {
        if (!packResult) return;
        sealedPack.hidden = true;
        cardsEl.classList.remove('is-sealed');
        cardsEl.classList.add('is-open');
        cardsEl.querySelectorAll('[data-reveal]').forEach((cardEl, i) => {
          if (!cardEl.animate) return;
          cardEl.animate([
            { transform: 'translateY(60px) scale(.48) rotateY(72deg) rotateX(16deg)', opacity: 0 },
            { transform: 'translateY(-14px) scale(1.06) rotateY(-9deg)', opacity: 1, offset: .65 },
            { transform: 'translateY(0) scale(1) rotateY(0) rotateX(0)', opacity: 1 }
          ], { duration: 780, delay: i * 150, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'backwards' });
        });
        $('hub-reveal-all').disabled = false;
        const status = $('hub-pack-status');
        if (status) status.textContent = 'Toque em uma carta.';
        const subtitle = $('hub-pack-subtitle');
        if (subtitle) subtitle.textContent = 'Toque para revelar.';
      }, 680));
    }

    function updatePackCompletion() {
      const buttons = [...dialog.querySelectorAll('[data-reveal]')];
      if (focusedCard) return;
      const all = buttons.length > 0 && buttons.every(button => button.classList.contains('is-revealed'));
      if (!all) return;
      const fragments = packResult?.draws?.reduce((total, card) => total + (card.fragments || 0), 0) || 0;
      const fresh = packResult?.draws?.filter(card => !card.duplicate).length || 0;
      const legacy = packResult?.draws?.filter(card => card.legacy).length || 0;
      $('hub-paste-pack').disabled = false;
      $('hub-reveal-all').disabled = true;
      const status = $('hub-pack-status');
      if (status) status.textContent = `${fresh} carta${fresh === 1 ? '' : 's'} nova${fresh === 1 ? '' : 's'}${fragments ? ` e ${fragments} fragmentos` : ''}${legacy ? ' · inclui carta de temporada anterior' : ''}.`;
      const subtitle = $('hub-pack-subtitle');
      if (subtitle) subtitle.textContent = 'Toque na carta para ampliar.';
    }

    function reveal(button) {
      if (!packResult || packProfile !== engine.profileId() || !dialog.open || !button || button.classList.contains('is-revealed')) return;
      const card = packResult.draws[Number(button.dataset.reveal)];
      if (!card) return;
      if (focusedCard && focusedCard !== button) return;
      button.classList.add('is-revealed');
      playSfx(PACK_SFX_URLS[card.rarity]);
      button.setAttribute('aria-label', `${card.name}, ${rarities[card.rarity]?.name || card.rarity}, ${card.duplicate ? `repetida: ${card.fragments} fragmentos` : 'nova carta'}${card.legacy ? `, ${card.seasonLabel}` : ''}`);

      if (focusedCard && focusedCard !== button) focusedCard.classList.remove('is-focus');
      const stage = $('hub-pack-stage');
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const cardRect = button.getBoundingClientRect();
        button.style.setProperty('--dx', `${stageRect.left + stageRect.width / 2 - (cardRect.left + cardRect.width / 2)}px`);
        button.style.setProperty('--dy', `${stageRect.top + stageRect.height / 2 - (cardRect.top + cardRect.height / 2) - 18}px`);
      }
      focusedCard = button;
      button.classList.add('is-focus');
      $('hub-reveal-all').disabled = true;
      const timer = setTimeout(() => {
        if (focusedCard === button) focusedCard = null;
        button.classList.remove('is-focus');
        updatePackCompletion();
        if (dialog.open && dialog.querySelector('[data-reveal]:not(.is-revealed)')) $('hub-reveal-all').disabled = false;
      }, 1550);
      revealTimers.push(timer);
      updatePackCompletion();
    }

    function revealAll() {
      if (focusedCard) return;
      const buttons = [...dialog.querySelectorAll('[data-reveal]:not(.is-revealed)')];
      if (!buttons.length) return;
      $('hub-reveal-all').disabled = true;
      buttons.forEach((button, index) => {
        const timer = setTimeout(() => {
          reveal(button);
          if (index === buttons.length - 1) {
            const finishTimer = setTimeout(() => {
              if (dialog.open && packResult) $('hub-reveal-all').disabled = true;
            }, 1600);
            revealTimers.push(finishTimer);
          }
        }, index * 1750);
        revealTimers.push(timer);
      });
    }

    // ------------------------------------------------------------------
    // Visualizador de carta em tela cheia
    // ------------------------------------------------------------------
    let viewerX = 0;
    let viewerY = 0;
    let viewerScale = 1;
    let viewerDragging = false;
    let viewerLastX = 0;
    let viewerLastY = 0;
    let viewerPointers = new Map();
    let pinchStart = 0;
    let pinchScale = 1;
    let viewerHideTimer = 0;

    function applyViewer() {
      const card = $('hub-viewer-card');
      if (card) card.style.transform = `rotateX(${viewerX}deg) rotateY(${viewerY}deg) scale(${viewerScale})`;
    }

    function resetViewer() {
      viewerX = 0;
      viewerY = 0;
      viewerScale = 1;
      viewerPointers.clear();
      viewerDragging = false;
      applyViewer();
    }

    function openViewer(cardId, key = null) {
      if (!viewer) return;
      const collection = engine.snapshot(key || selectedSeason || undefined);
      const card = collection.cards.find(item => item.id === cardId && item.owned);
      if (!card) return;
      (dialog?.open ? dialog : document.body).appendChild(viewer);
      viewerKey = key || collection.key;
      const decorated = decorate(card, viewerKey);
      const host = $('hub-viewer-card');
      if (host) host.innerHTML = `<div class="ac-viewer-front">${cardMarkup(card, { key: viewerKey, tilt: false })}</div><div class="ac-viewer-back">${cardBackMarkup()}</div>`;
      const name = $('hub-viewer-name');
      if (name) name.textContent = decorated.name;
      const rarity = $('hub-viewer-rarity');
      if (rarity) rarity.textContent = `${rarities[decorated.rarity]?.name || decorated.rarity} · ${decorated.finish || ''}`;
      clearTimeout(viewerHideTimer);
      viewerReturnFocus = document.activeElement;
      resetViewer();
      viewer.hidden = false;
      viewer.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => viewer.classList.add('is-open'));
      $('hub-viewer-close')?.focus();
    }

    function closeViewer(immediate = false) {
      if (!viewer || viewer.hidden) return;
      if (document.fullscreenElement === viewer) document.exitFullscreen?.().catch?.(() => {});
      viewer.classList.remove('is-open');
      viewer.setAttribute('aria-hidden', 'true');
      clearTimeout(viewerHideTimer);
      const hide = () => { viewer.hidden = true; };
      if (immediate) hide();
      else viewerHideTimer = setTimeout(hide, 220);
      resetViewer();
      viewerReturnFocus?.focus?.();
    }

    async function toggleViewerFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (viewer.requestFullscreen) await viewer.requestFullscreen();
        else viewer.classList.toggle('is-pseudo-full');
      } catch (_) {
        viewer.classList.toggle('is-pseudo-full');
      }
    }

    function viewerPointerDistance() {
      const points = [...viewerPointers.values()];
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    }

    // ------------------------------------------------------------------
    // Interações
    // ------------------------------------------------------------------
    modal.addEventListener('load', event => {
      const image = event.target;
      if (image.matches?.('.ac-season-background')) {
        image.parentElement.hidden = false;
        image.closest('.ac-season')?.classList.add('has-banner');
      }
    }, true);

    modal.addEventListener('error', event => {
      const image = event.target;
      if (image.dataset?.fallback && !image.dataset.fallbackUsed) { image.dataset.fallbackUsed = 'true'; image.src = image.dataset.fallback; return; }
      if (event.target.matches?.('.ac-season-logo')) event.target.hidden = true;
    }, true);

    modal.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      const collection = book();

      if (action === 'view') { openViewer(id, selectedSeason || undefined); return; }
      if (action === 'export-gif') { window.cardStudio?.openExport?.(collection); return; }
      if (action === 'go-album') { setTab('album', true); return; }
      if (action === 'go-rewards') { setTab('rewards', true); return; }
      if (action === 'open-pack') { openPack(); return; }
      if (action === 'category') {
        page = clamp(Number(id), 0, 2) * 2;
        render();
        $('album-page-title')?.focus({ preventScroll: true });
        return;
      }
      if (action === 'paste') {
        if (run(() => engine.pasteCard(collection.key, id))) {
          notice('Carta colada.');
          modal.querySelector(`[data-card="${id}"]`)?.classList.add('just-pasted');
          $('album-page-title')?.focus({ preventScroll: true });
        }
        return;
      }
      if (action === 'craft') {
        if (run(() => { engine.craftCard(collection.key, id); return true; })) {
          notice('Carta criada! Agora é só colar no álbum.');
          modal.querySelector(`[data-action="paste"][data-id="${id}"]`)?.focus({ preventScroll: true });
        }
        return;
      }
      if (action === 'claim') {
        const reward = run(() => engine.claimReward(collection.key, id));
        if (reward) {
          notice(`Prêmio resgatado: ${reward.name}! +${reward.fragments} fragmentos.`);
          modal.querySelector(`[data-action="equip"][data-id="${id}"]`)?.focus({ preventScroll: true });
        }
        return;
      }
      if (action === 'equip' || action === 'equip-archive') {
        run(() => {
          engine.equipReward(button.dataset.season || collection.key, id);
          notice('Prêmio equipado.');
          $('hub-tab-rewards')?.focus({ preventScroll: true });
        });
        return;
      }
      if (action === 'retry-achievements') {
        achievements.loadPromise = null;
        achievements.refresh().then(render);
      }
    });

    $('hub-album')?.addEventListener('change', event => {
      if (event.target.id !== 'hub-season-select') return;
      selectedSeason = event.target.value;
      page = 0;
      render();
      $('hub-season-select')?.focus();
    });

    modal.querySelector('.ac-tabs')?.addEventListener('click', event => {
      const button = event.target.closest('[data-hub-tab]');
      if (button) setTab(button.dataset.hubTab);
    });

    modal.querySelector('.ac-tabs')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = ['achievements', 'album', 'rewards'];
      let index = tabs.indexOf(tab);
      index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      event.preventDefault();
      setTab(tabs[index], true);
    });

    $('achievements-filter')?.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      filter = button.dataset.filter;
      $('achievements-filter').querySelectorAll('button').forEach(item => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      render();
    });

    $('hub-home')?.addEventListener('click', event => {
      event.preventDefault();
      setTab('achievements', true);
    });

    $('achievements-fab')?.addEventListener('click', open);
    $('achievements-silent-toast-open')?.addEventListener('click', () => {
      open();
      if (engine.snapshot().packs) setTab('album');
    });
    $('close-achievements-modal')?.addEventListener('click', close);

    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });

    modal.addEventListener('keydown', event => {
      if (dialog?.open || (viewer && !viewer.hidden)) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not(:disabled), a[href], input, select, summary, [tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    $('achievements-mark-seen')?.addEventListener('click', () => achievements.markAllSeen());

    $('achievements-sound-toggle')?.addEventListener('change', event => {
      achievements.setSoundEnabled(event.target.checked);
      if (!event.target.checked) { stopAllAudio(); $('achievements-audio')?.pause(); }
      else if (dialog?.open) playPackMusic();
    });

    $('hub-pack-close')?.addEventListener('click', () => dialog.close());
    $('hub-pack-open')?.addEventListener('click', burstPack);

    dialog?.addEventListener('close', () => {
      closeViewer(true);
      document.body.appendChild(viewer);
      clearRevealTimers();
      stopAllAudio({ reverb: true });
      dialog.classList.remove('is-booming');
      packResult = null;
      packProfile = null;
      if (modal.style.display === 'flex') modal.querySelector('[data-action="open-pack"]')?.focus();
    });

    dialog?.addEventListener('click', event => {
      const button = event.target.closest('[data-reveal]');
      if (!button) return;
      if (button.classList.contains('is-revealed')) { const card = packResult?.draws?.[Number(button.dataset.reveal)]; if (card) openViewer(card.id, card.season || packResult.key); }
      else reveal(button);
    });

    $('hub-reveal-all')?.addEventListener('click', revealAll);
    $('hub-paste-pack')?.addEventListener('click', () => {
      if (!packResult || packProfile !== engine.profileId()) { dialog.close(); return; }
      const result = run(() => {
        packResult.draws.filter(card => !card.duplicate).forEach(card => engine.pasteCard(card.season || packResult.key, card.id, packProfile));
        return true;
      });
      if (result) {
        selectedSeason = packResult.key;
        page = (packResult.draws.find(card => !card.season || card.season === packResult.key) || packResult.draws[0]).page;
        dialog.close();
        setTab('album', true);
        notice('Cartas coladas nos álbuns correspondentes.');
      }
    });

    // Visualizador
    $('hub-viewer-close')?.addEventListener('click', () => closeViewer());
    $('hub-viewer-reset')?.addEventListener('click', resetViewer);
    $('hub-viewer-fullscreen')?.addEventListener('click', toggleViewerFullscreen);
    viewer?.addEventListener('click', event => {
      if (event.target === viewer || event.target.classList.contains('ac-viewer-backdrop')) closeViewer();
    });

    const viewerStage = $('hub-viewer-stage');
    viewerStage?.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      viewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (viewerPointers.size === 1) {
        viewerDragging = true;
        viewerLastX = event.clientX;
        viewerLastY = event.clientY;
      } else if (viewerPointers.size === 2) {
        viewerDragging = false;
        pinchStart = viewerPointerDistance();
        pinchScale = viewerScale;
      }
      viewerStage.setPointerCapture?.(event.pointerId);
    });

    viewerStage?.addEventListener('pointermove', event => {
      if (!viewerPointers.has(event.pointerId)) return;
      viewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (viewerPointers.size === 2) {
        const distance = viewerPointerDistance();
        if (pinchStart > 0) {
          viewerScale = clamp(pinchScale * distance / pinchStart, .7, 2.2);
          applyViewer();
        }
        return;
      }
      if (!viewerDragging) return;
      const dx = event.clientX - viewerLastX;
      const dy = event.clientY - viewerLastY;
      viewerLastX = event.clientX;
      viewerLastY = event.clientY;
      viewerY += dx * .45;
      viewerX = clamp(viewerX - dy * .45, -70, 70);
      applyViewer();
    });

    const releaseViewerPointer = event => {
      viewerPointers.delete(event.pointerId);
      if (viewerPointers.size < 2) pinchStart = 0;
      if (viewerPointers.size === 0) viewerDragging = false;
    };
    viewerStage?.addEventListener('pointerup', releaseViewerPointer);
    viewerStage?.addEventListener('pointercancel', releaseViewerPointer);
    viewerStage?.addEventListener('dragstart', event => event.preventDefault());
    viewer?.addEventListener('selectstart', event => event.preventDefault());
    viewerStage?.addEventListener('wheel', event => {
      event.preventDefault();
      viewerScale = clamp(viewerScale * (event.deltaY > 0 ? .92 : 1.08), .7, 2.2);
      applyViewer();
    }, { passive: false });
    viewerStage?.addEventListener('dblclick', toggleViewerFullscreen);

    viewer?.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeViewer(); }
    });

    document.addEventListener('fullscreenchange', () => {
      const button = $('hub-viewer-fullscreen');
      if (button) {
        const active = document.fullscreenElement === viewer;
        button.setAttribute('aria-label', active ? 'Sair da tela cheia' : 'Tela cheia');
        button.title = active ? 'Sair da tela cheia' : 'Tela cheia';
      }
    });

    // Tilt 3D dos painéis que não são cartas
    let tiltTarget = null;
    let tiltFrame = 0;
    document.addEventListener('pointermove', event => {
      const target = event.target.closest('[data-ac-tilt]');
      if (!target) {
        if (tiltTarget) {
          tiltTarget.classList.remove('is-tilting');
          tiltTarget.style.removeProperty('--ac-rx');
          tiltTarget.style.removeProperty('--ac-ry');
          tiltTarget = null;
        }
        return;
      }
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      tiltTarget = target;
      cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        target.style.setProperty('--ac-rx', `${(0.5 - y) * 10}deg`);
        target.style.setProperty('--ac-ry', `${(x - 0.5) * 14}deg`);
        target.classList.add('is-tilting');
      });
    }, { passive: true });

    document.addEventListener('pointerout', event => {
      if (!tiltTarget) return;
      if (tiltTarget.contains(event.relatedTarget)) return;
      tiltTarget.classList.remove('is-tilting');
      tiltTarget.style.removeProperty('--ac-rx');
      tiltTarget.style.removeProperty('--ac-ry');
      tiltTarget = null;
    });

    window.addEventListener('pagehide', () => stopAllAudio());

    // Eventos globais
    window.addEventListener('achievements:updated', () => run(render));
    window.addEventListener('collection:updated', () => run(render));
    window.addEventListener('card-art:updated', () => run(render));
    window.addEventListener('aniverse:theme-changed', () => run(render));
    window.addEventListener('collection:error', event => {
      notice(event.detail.message, true);
      const toast = $('achievements-silent-toast');
      const text = $('achievements-silent-toast-text');
      if (text) text.textContent = event.detail.message;
      if (toast) toast.style.display = 'flex';
    });
    window.addEventListener('aniverse:profile-changed', () => {
      clearTimeout(noticeTimer);
      const noticeBox = $('hub-notice');
      if (noticeBox) noticeBox.hidden = true;
      $('achievements-audio')?.pause();
      dialog?.close();
      closeViewer(true);
      selectedSeason = null;
      page = 0;
      achievements.refresh({ eventType: 'app_open' }).then(() => run(render));
    });
    window.addEventListener('storage', event => {
      if (event.key?.startsWith('aniverse:collection:') || event.key?.startsWith('aniVerseAchievementsState:')) run(render);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) run(render);
    });

    achievements.loadData().then(() => achievements.refresh({ eventType: 'app_open' })).then(() => run(render));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
