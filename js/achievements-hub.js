(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const shapes = {
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
  function progress(value, max, label) {
    const pct = Math.min(100, max ? value / max * 100 : 0);
    return `<div class="hub-progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}"><span style="width:${pct}%"></span></div>`;
  }

  function init() {
    const modal = $('achievements-modal'), engine = window.collectionEngine, achievements = window.achievementEngine;
    if (!modal || !engine || !achievements) return;
    const rarities = window.collectionRarities;
    let tab = 'achievements', filter = 'all', selectedSeason = null, page = 0, returnFocus = null, bodyOverflow = '';
    let packResult = null, packProfile = null, noticeTimer, monthTimer;
    const dialog = $('hub-pack-dialog');

    // Música em loop enquanto o pacote está sendo aberto +
    // efeitos sonoros com "ducking": quando um efeito toca, o volume
    // da música abaixa; quando o efeito acaba, a música volta ao normal.
    const PACK_MUSIC_URL = 'https://media.ffycdn.net/eu/supercell/MMEcCXnkjEpz8g353kee.wav?width=1024&format=mp3';
    const PACK_SFX_URLS = {
      incoming: 'https://media.ffycdn.net/eu/supercell/Rp2VDXmsQBAmWWuawcKG.ogg?width=1024&format=mp3',
      common: 'https://media.ffycdn.net/eu/supercell/c7t6bnYarrkqtkr77uon.ogg?width=1024&format=mp3',
      rare: 'https://media.ffycdn.net/eu/supercell/oXFZGhPEUvyLeX6btdJT.ogg?width=1024&format=mp3',
      epic: 'https://media.ffycdn.net/eu/supercell/zPzLedKz3SEzVbMhQ9ZT.ogg?width=1024&format=mp3',
      legendary: 'https://media.ffycdn.net/eu/supercell/dctGTKKJtb6QHvzisadV.ogg?width=1024&format=mp3'
    };
    const MUSIC_BASE_VOLUME = 0.45;
    const MUSIC_DUCK_VOLUME = 0.12;
    let packAudio = null;
    let activeSfxCount = 0;
    let activeSfxAudios = [];
    let musicRampTimer = null;

    function soundOn() {
      return achievements.getSnapshot?.()?.soundEnabled !== false;
    }
    function rampMusicVolume(target, durationMs = 300) {
      if (!packAudio) return;
      const audio = packAudio;
      const from = audio.volume;
      const steps = Math.max(1, Math.round(durationMs / 30));
      let step = 0;
      clearInterval(musicRampTimer);
      musicRampTimer = setInterval(() => {
        step++;
        const t = step / steps;
        try { audio.volume = Math.min(1, Math.max(0, from + (target - from) * t)); } catch (_) {}
        if (step >= steps) clearInterval(musicRampTimer);
      }, 30);
    }
    function playPackMusic() {
      try {
        if (!soundOn()) return;
        if (!packAudio) {
          packAudio = new Audio(PACK_MUSIC_URL);
          packAudio.preload = 'auto';
        }
        packAudio.loop = true; // música sempre em loop
        packAudio.volume = MUSIC_BASE_VOLUME;
        packAudio.currentTime = 0;
        packAudio.play().catch(() => {});
      } catch (_) {}
    }
    function stopPackMusic() {
      // Para os efeitos que estiverem tocando e a música
      activeSfxAudios.forEach(audio => { try { audio.pause(); } catch (_) {} });
      activeSfxAudios = [];
      activeSfxCount = 0;
      clearInterval(musicRampTimer);
      if (!packAudio) return;
      try { packAudio.pause(); packAudio.currentTime = 0; } catch (_) {}
    }
    function playSfx(url) {
      if (!url) return;
      try {
        if (!soundOn()) return;
        const sfx = new Audio(url);
        sfx.volume = 0.9;
        sfx.preload = 'auto';
        activeSfxCount++;
        activeSfxAudios.push(sfx);
        rampMusicVolume(MUSIC_DUCK_VOLUME, 160); // música abaixa para o efeito brilhar
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          activeSfxCount = Math.max(0, activeSfxCount - 1);
          activeSfxAudios = activeSfxAudios.filter(a => a !== sfx);
          if (activeSfxCount === 0) {
            rampMusicVolume(MUSIC_BASE_VOLUME, 450); // efeito acabou: música volta ao normal
          }
        };
        sfx.addEventListener('ended', finish, { once: true });
        sfx.addEventListener('error', finish, { once: true });
        const promise = sfx.play();
        if (promise && typeof promise.catch === 'function') promise.catch(finish);
      } catch (_) {}
    }

    // Artwork belongs to the monthly edition, including archived albums.
    function seasonHero(collection, content) {
      return `<section class="hub-season-showcase" aria-label="${esc(collection.name)}"><div class="hub-season-artwork" hidden><img class="hub-season-background" src="${esc(collection.bannerSrc)}" alt="" width="1920" height="720" decoding="async" data-no-retry="true"><img class="hub-season-logo" src="${esc(collection.logoSrc)}" alt="${esc(collection.name)}" width="640" height="320" decoding="async" data-no-retry="true" hidden></div><div class="hub-season-hero" style="--season:${collection.color}">${content}</div></section>`;
    }
    modal.addEventListener('load', event => {
      const image = event.target;
      if (image.matches?.('.hub-season-background')) {
        image.parentElement.hidden = false;
        image.closest('.hub-season-showcase').classList.add('has-season-banner');
      } else if (image.matches?.('.hub-season-logo')) image.hidden = false;
    }, true);
    modal.addEventListener('error', event => {
      if (event.target.matches?.('.hub-season-logo')) event.target.hidden = true;
    }, true);

    function notice(text, error = false) {
      const node = $('hub-notice');
      node.textContent = text; node.hidden = false; node.classList.toggle('is-error', error);
      clearTimeout(noticeTimer); noticeTimer = setTimeout(() => node.hidden = true, 6500);
    }
    function run(action) {
      try { return action(); } catch (error) { notice(error.message || 'Não foi possível salvar. Verifique o armazenamento do navegador.', true); return null; }
    }
    function book() { return engine.snapshot(selectedSeason || undefined); }
    function setTab(next, focus = false) {
      tab = next;
      document.querySelectorAll('[data-hub-tab]').forEach(button => {
        const active = button.dataset.hubTab === next;
        button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
        $(`hub-panel-${button.dataset.hubTab}`).hidden = !active;
        if (active && focus) button.focus();
      });
      render();
    }
    function updateFab() {
      const snapshot = achievements.getSnapshot();
      const collection = engine.snapshot();
      const packs = collection.archive.reduce((total, key) => total + engine.snapshot(key).packs, 0);
      const unseen = snapshot?.unseenCount || 0;
      $('achievements-fab').style.display = 'flex';
      $('achievements-fab').setAttribute('aria-label', `Conquistas e álbum${packs ? `, ${packs} pacotes disponíveis` : ''}`);
      $('achievements-fab-count').textContent = unseen + packs;
      $('achievements-fab-count').style.display = unseen + packs ? 'inline-flex' : 'none';
      modal.ownerDocument.querySelector('.achievements-fab-dot').style.display = unseen + packs ? 'block' : 'none';
      $('hub-pack-count').textContent = packs; $('hub-pack-count').hidden = !packs;
      const toast = $('achievements-silent-toast');
      toast.style.display = unseen + packs && modal.style.display !== 'flex' ? 'flex' : 'none';
      $('achievements-silent-toast-text').textContent = packs ? `${packs} pacote${packs > 1 ? 's' : ''} esperando por você!` : `${unseen} nova${unseen > 1 ? 's' : ''} conquista${unseen > 1 ? 's' : ''}!`;
    }
    function renderAchievements(snapshot, collection) {
      if (!snapshot) { $('achievements-list').innerHTML = '<div class="hub-empty">As conquistas não carregaram. <button type="button" data-action="retry-achievements">Tentar novamente</button></div>'; return; }
      const unlocked = snapshot.items.filter(item => item.unlocked).length;
      $('achievements-stats').innerHTML = `
        <div class="club-stat"><span class="club-stat-icon">✦</span><span class="club-stat-text"><strong>${unlocked}<small>/${snapshot.items.length}</small></strong><span>Conquistas</span></span></div>
        <div class="club-stat"><span class="club-stat-icon alt">▶</span><span class="club-stat-text"><strong>${snapshot.stats.episodesCompleted}</strong><span>Episódios completos</span></span></div>
        <div class="club-stat"><span class="club-stat-icon alt2">🔥</span><span class="club-stat-text"><strong>${snapshot.stats.streak}<small> dias</small></strong><span>Sequência atual</span></span></div>`;
      const ordered = [...snapshot.items].sort((a, b) => Number(a.unlocked) - Number(b.unlocked) || b.progressPercent - a.progressPercent);
      const visible = ordered.filter(item => filter === 'all' || (filter === 'unlocked' ? item.unlocked : !item.unlocked));
      $('achievements-list').innerHTML = visible.map((item, index) => `<article class="achievement-card ${item.unlocked ? 'is-unlocked' : 'is-locked'}" style="--entry:${Math.min(index, 8)}">
        <div class="club-card-top"><div class="hub-medallion ${item.unlocked ? 'earned' : ''}"><img src="${esc(item.icon)}" alt="" loading="lazy" decoding="async"></div><span class="club-chip ${item.unlocked ? 'done' : item.progressPercent >= 50 ? 'close' : ''}">${item.unlocked ? '✓ Desbloqueada' : item.progressPercent >= 50 ? 'Quase lá!' : `${item.progressPercent}%`}</span></div>
        <h4>${esc(item.name)}</h4><p>${esc(item.desc)}</p>
        <div class="club-card-foot">${progress(item.progress, item.goal, item.name)}<div class="achievement-progress">${item.unlocked ? 'Conquista guardada no seu perfil ✦' : `${item.progress} de ${item.goal} · faltam ${Math.max(0, item.goal - item.progress)}`}</div></div></article>`).join('') || '<div class="hub-empty">Nenhuma conquista por aqui ainda. Seu próximo play pode mudar isso.</div>';
      $('achievements-sound-toggle').checked = snapshot.soundEnabled;
      const next = ordered.find(item => !item.unlocked);
      $('hub-next-goal').innerHTML = `<div class="club-next"><span class="club-next-icon">${art('trophy')}</span><div class="club-next-copy"><span class="hub-eyebrow">${next ? '🎯 PRÓXIMO OBJETIVO' : '🎉 VOCÊ COMPLETOU TUDO'}</span><h3>${esc(next?.name || 'Todas as conquistas!')}</h3><p>${esc(next?.desc || 'Agora tem uma galeria inteira esperando pela sua próxima aventura.')}</p>${next ? progress(next.progress, next.goal, next.name) : ''}</div><strong class="club-next-pct">${next ? `${next.progressPercent}%` : '100%'}</strong></div>`;
      $('hub-season-preview').innerHTML = `<button type="button" class="club-season-banner" data-action="go-album" style="--season:${collection.color}"><span class="club-season-banner-icon">${art(collection.icon)}</span><span class="club-season-banner-copy"><span class="hub-eyebrow">${collection.comingSoon ? 'ESTREIA EM NOVEMBRO' : 'GALERIA DO MÊS · ' + esc(collection.label)}</span><strong>${esc(collection.name)}</strong><small>24 figurinhas para colecionar, colar e mostrar para todo mundo.</small></span><span class="club-season-banner-cta">${collection.comingSoon ? 'Conhecer ↗' : 'Abrir galeria ↗'}</span></button>`;
    }
    function packArt() { return `<div class="hub-pack-illustration" aria-hidden="true"><div class="hub-pack-shadow"></div><div class="hub-pack-object"><span>ANIVERSE · FIGURINHAS</span>${art('compass')}<strong>SEU<br>PACOTE<br>✦</strong><small>3 CARTAS NOVAS</small></div><span class="hub-pack-spark spark-a">✦</span><span class="hub-pack-spark spark-b">✧</span></div>`; }
    function cardMarkup(card, { reveal = false } = {}) {
      card = window.cardStudio.decorate(card, book().key);
      const rarity = rarities[card.rarity];
      return `<div class="sticker-art rarity-${card.rarity} ${card.pasted ? 'is-pasted' : ''}" data-card-tilt><div class="sticker-art-top"><span>ANV / ${String(card.number).padStart(2, '0')}</span><span>${card.rarity === 'legendary' ? '✦✦✦' : '✦'}</span></div>${window.cardStudio.photo(card)}<div class="sticker-caption"><small>${esc(card.group)}</small><strong>${esc(card.name)}</strong><span class="sticker-rarity">${rarity.name} · ${card.finish}${card.pasted && !reveal ? ' · ✓' : ''}</span></div><span class="card-finish-light" aria-hidden="true"></span></div>`;
    }
    function launchPreview(collection) {
      return seasonHero(collection, `<div class="hub-season-copy"><span class="hub-season-tag">ESTREIA EM 1º DE NOVEMBRO DE 2026</span><h3>${esc(collection.name)}</h3><p>Uma nova aventura chega em novembro: 24 cartas para colecionar e personagens para liberar como avatares.</p><p>A partir da estreia, cada episódio inédito concluído vale 100 pontos. A cada 300 pontos, você ganha um pacote com 3 cartas. Uma nova temporada começa no primeiro dia de cada mês.</p></div><div class="hub-season-emblem">${art(collection.icon)}<span>NOVEMBRO · 2026</span></div>`);
    }
    function renderAlbum(collection) {
      if (collection.comingSoon) { $('hub-album').innerHTML = launchPreview(collection); return; }
      const cards = collection.cards.filter(card => card.page === page).map(card => window.cardStudio.decorate(card, collection.key));
      const category = Math.floor(page / 2), pasted = collection.pasted.length;
      const days = Math.max(0, Math.ceil((new Date(collection.endsAt) - new Date()) / 86400000));
      $('hub-album').innerHTML = `<div class="hub-album-toolbar"><div><span class="hub-eyebrow">🖼 GALERIA DE FIGURINHAS</span><h3>Coleção deste mês</h3></div><label class="hub-season-select">Temporada<select id="hub-season-select" aria-label="Selecionar temporada">${collection.archive.map(key => `<option value="${key}" ${key === collection.key ? 'selected' : ''}>${esc(engine.snapshot(key).label)}${key === collection.currentKey ? ' · Atual' : ' · Arquivado'}</option>`).join('')}</select></label></div>
        <div class="card-studio-toolbar"><button type="button" class="hub-button secondary" data-action="export-gif" ${collection.owned.length ? '' : 'disabled'}>Exportar coleção em GIF ↗</button><span>Comum fosca · Rara brilhante · Épica holográfica · Lendária metálica</span></div>
        ${seasonHero(collection, `<div class="hub-season-copy"><span class="hub-season-tag"><span></span>${collection.isCurrent ? `TEMPORADA ATUAL · ${days} DIAS RESTANTES` : 'ÁLBUM ARQUIVADO · SUA HISTÓRIA CONTINUA AQUI'}</span><h3>${esc(collection.name)}</h3><p>${esc(collection.tag)}<br>Colecione os encontros dessa aventura.</p><div class="hub-album-meter"><strong>${pasted}<small> / 24 cartas coladas</small></strong><span>${Math.round(pasted / 24 * 100)}%</span></div>${progress(pasted, 24, 'Álbum completo')}<span class="hub-tiny">${collection.owned.length - pasted} carta(s) esperando para colar</span></div><div class="hub-season-emblem">${art(collection.icon)}<span>EDIÇÃO ${esc(collection.key.replace('-', '.'))}</span></div>`)}
        <div class="hub-pack-station">${packArt()}<div><span class="hub-eyebrow">🎁 PACOTES</span><h3>${collection.packs ? `${collection.packs} pacote${collection.packs > 1 ? 's' : ''} para abrir!` : collection.isCurrent ? 'O próximo pacote está chegando.' : 'Uma aventura para guardar.'}</h3><p>${collection.isCurrent ? 'Cada episódio inédito concluído vale 100 pontos.<br>Junte 300 pontos para receber 3 cartas.' : 'Abra os pacotes guardados ou use fragmentos para completar as cartas que faltam.'}</p>${collection.isCurrent ? `${progress(collection.progress, 300, 'Pontos para o próximo pacote')}<span class="hub-tiny">${collection.progress}/300 pontos · Faltam ${300 - collection.progress} para o próximo pacote</span>` : ''}<button type="button" class="hub-button" data-action="open-pack" ${collection.packs ? '' : 'disabled'}>${collection.packs ? 'Abrir um pacote ✦' : 'Continue assistindo para ganhar'}</button></div><div class="hub-fragment-balance">${art('gem')}<strong>${collection.fragments}</strong><span>Fragmentos</span><small>Cartas repetidas viram<br>novas possibilidades.</small></div></div>
        <div class="hub-book-heading"><div><span class="hub-eyebrow">COLECIONE · COLE · COMPLETE</span><h3 id="album-page-title" tabindex="-1">${esc(collection.groups[category][0])} <small>Página ${page + 1} de 6</small></h3></div><div class="hub-page-controls"><button type="button" class="hub-icon-button" data-action="prev-page" aria-label="Página anterior" ${page === 0 ? 'disabled' : ''}>←</button><button type="button" class="hub-icon-button" data-action="next-page" aria-label="Próxima página" ${page === 5 ? 'disabled' : ''}>→</button></div></div>
        <div class="hub-category-nav">${collection.groups.map(([name], i) => `<button type="button" data-action="category" data-id="${i}" aria-pressed="${category === i}" class="${category === i ? 'is-active' : ''}">${esc(name)}<span>${collection.cards.filter(c => c.category === i && c.pasted).length}/8</span></button>`).join('')}</div>
        <div class="hub-album-page">${cards.map(card => `<article class="hub-sticker-slot ${card.owned ? 'is-owned' : 'is-missing'}" data-card="${card.id}">${card.owned ? cardMarkup(card) : `<div class="sticker-placeholder rarity-${card.rarity}"><span class="sticker-slot-number">${String(card.number).padStart(2, '0')}</span><span class="sticker-scene-mark" aria-hidden="true">▧</span><strong>${esc(card.name)}</strong><span class="sticker-rarity">${rarities[card.rarity].name}</span></div>`}<div class="hub-sticker-action">${card.pasted ? '<span class="hub-pasted-label">✓ Faz parte da sua história</span>' : card.owned ? `<button type="button" class="hub-button" data-action="paste" data-id="${card.id}">Colar no álbum +</button>` : `<button type="button" class="hub-craft-button" data-action="craft" data-id="${card.id}" ${collection.fragments < rarities[card.rarity].cost ? 'disabled' : ''}>Criar · ${rarities[card.rarity].cost} fragmentos</button>`}</div></article>`).join('')}</div>
        <div class="hub-page-reward">${art('trophy')}<div><strong>${cards.every(c => c.pasted) ? 'Uma página completa. Uma história conquistada.' : 'Quatro cartas. Um prêmio esperando por você.'}</strong><p>Complete esta página para resgatar um selo e 30 fragmentos.</p></div><button type="button" class="hub-text-button" data-action="go-rewards">Ver prêmio ↗</button></div>
        <details class="hub-rules"><summary>Como funcionam as cartas e as temporadas?</summary><div><p>100 pontos por episódio concluído pela primeira vez neste sistema, por perfil. Reassistir ao mesmo episódio não gera novos pontos. A cada 300 pontos da temporada, você recebe um pacote de 3 cartas.</p><p>Nas duas primeiras cartas: comum 60%, rara 28%, épica 10%, lendária 2%. A terceira garante rara ou melhor: rara 70%, épica 25%, lendária 5%. Pode haver repetidas, inclusive no mesmo pacote.</p><p>Repetidas viram fragmentos: comum 10, rara 20, épica 40, lendária 80. Crie uma carta à sua escolha por 30, 60, 120 ou 240 fragmentos, respectivamente.</p><p>O tema muda no primeiro dia de cada mês, no horário do aparelho. Os pontos do próximo pacote começam do zero no novo álbum. Álbuns antigos, pacotes já ganhos e fragmentos ficam guardados. Você pode completar álbuns antigos com seus pacotes guardados ou criando cartas.</p><p>Prêmios são cosméticos: selos por página, títulos por categoria e um troféu por álbum. Colar todas as 24 cartas também libera automaticamente os personagens como avatares no editor deste perfil, inclusive depois que a temporada acaba. Sua coleção fica salva apenas neste navegador e perfil.</p></div></details>`;
    }
    function renderRewards(collection) {
      if (collection.comingSoon) { $('hub-rewards').innerHTML = launchPreview(collection); return; }
      $('hub-rewards').innerHTML = `<div class="hub-rewards-intro">${art('trophy')}<span class="hub-eyebrow">NÃO É SÓ COMPLETAR. É CONQUISTAR.</span><h3>Seus prêmios</h3><p>Complete páginas e categorias para encher sua estante de troféus.</p></div><div class="hub-reward-season"><h4>${esc(collection.name)}</h4><span>${esc(collection.label)} · ${collection.rewards.filter(r => r.claimed).length}/10 prêmios</span></div><div class="hub-rewards-grid">${collection.rewards.map(reward => `<article class="hub-reward ${reward.claimed ? 'is-claimed' : reward.ready ? 'is-ready' : ''}"><span class="hub-reward-kind">${esc(reward.kind)}</span><div class="hub-reward-medal">${art(reward.icon)}</div><h4>${esc(reward.name)}</h4><p>+${reward.fragments} fragmentos${reward.id === 'album' ? '<br><strong class="hub-avatar-prize">24 avatares de personagens</strong><br><small>' + (reward.ready ? 'Liberados no editor deste perfil ✓' : 'Liberados ao colar a última carta') + '</small>' : ''}</p>${reward.claimed ? `<button type="button" class="hub-button secondary" data-action="equip" data-id="${reward.id}" ${collection.equipped?.id === reward.id && collection.equipped?.season === collection.key ? 'disabled' : ''}>${collection.equipped?.id === reward.id && collection.equipped?.season === collection.key ? 'Em destaque ✓' : 'Usar no meu clube'}</button>` : `<button type="button" class="hub-button" data-action="claim" data-id="${reward.id}" ${reward.ready ? '' : 'disabled'}>${reward.ready ? 'Resgatar prêmio ✦' : reward.id === 'album' ? 'Complete o álbum' : reward.id.startsWith('page') ? 'Complete a página' : 'Complete a categoria'}</button>`}</article>`).join('')}</div><div class="hub-showcase"><h3>Histórias que ficam</h3><p>Seus prêmios de todas as temporadas.</p><div>${collection.showcase.map(reward => `<button type="button" class="hub-showcase-badge" data-action="equip-archive" data-id="${reward.id}" data-season="${reward.season}">${art(reward.icon)}<strong>${esc(reward.name)}</strong><small>${esc(reward.season)}</small></button>`).join('') || '<span class="hub-empty">Seu primeiro prêmio vai morar aqui. Complete uma página para começar.</span>'}</div></div>`;
    }
    function render() {
      updateFab();
      if (modal.style.display !== 'flex') return;
      const collection = book(), snapshot = achievements.getSnapshot();
      modal.dataset.season = `${collection.key}:${collection.comingSoon}`;
      modal.style.setProperty('--season', collection.color);
      $('hub-collector-badge').innerHTML = `${art(collection.equipped?.icon || 'compass')}<span>${collection.equipped ? 'SEU DESTAQUE' : 'UMA JORNADA SÓ SUA'}<strong>${esc(collection.equipped?.name || 'Colecionador de histórias')}</strong><small>${esc(window.profileManager?.getActiveProfile?.()?.name || 'Visitante')} · ${collection.fragments} fragmentos</small></span>`;
      if (tab === 'achievements') renderAchievements(snapshot, collection);
      if (tab === 'album') renderAlbum(collection);
      if (tab === 'rewards') renderRewards(collection);
    }
    function open() {
      if (modal.style.display !== 'flex') { returnFocus = document.activeElement; bodyOverflow = document.body.style.overflow; }
      selectedSeason = null; page = 0;
      modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
      render(); $('close-achievements-modal').focus();
      const pending = achievements.drainPendingUnlocks();
      if (pending.length) {
        notice(`${pending.length} nova(s) conquista(s)! Seu progresso merece ser celebrado.`);
        const snapshot = achievements.getSnapshot();
        if (snapshot?.soundEnabled && pending[0].sound) { $('achievements-audio').src = pending[0].sound; $('achievements-audio').play().catch(() => {}); }
        achievements.markAllSeen();
      }
      clearInterval(monthTimer);
      monthTimer = setInterval(() => {
        const collection = book();
        if (!selectedSeason && `${collection.key}:${collection.comingSoon}` !== modal.dataset.season) render();
      }, 30000);
    }
    function close() {
      if (dialog.open) dialog.close();
      modal.style.display = 'none'; document.body.style.overflow = bodyOverflow;
      clearInterval(monthTimer); updateFab(); returnFocus?.focus();
    }
    function openPack() {
      const collection = book();
      const draws = run(() => engine.openPack(collection.key));
      if (!draws) return;
      packResult = { key: collection.key, draws }; packProfile = collection.profileId;
      $('hub-pack-cards').innerHTML = draws.map((card, i) => `<button type="button" class="hub-reveal-card" data-reveal="${i}" aria-label="Revelar carta ${i + 1}" style="--entry:${i}"><span class="hub-card-back">${art('compass')}<strong>ANIVERSE</strong><small>TOQUE PARA DESCOBRIR</small></span><span class="hub-card-front">${cardMarkup(card, { reveal: true })}<span class="hub-draw-note">${card.duplicate ? `Repetida · +${card.fragments} fragmentos` : 'NOVA NA SUA COLEÇÃO ✦'}</span></span></button>`).join('');
      const cardsEl = $('hub-pack-cards');
      cardsEl.classList.add('is-sealed'); cardsEl.classList.remove('is-open');
      const sealedPack = $('hub-pack-open');
      sealedPack.hidden = false; sealedPack.classList.remove('is-burst');
      if (sealedPack.getAnimations) sealedPack.getAnimations().forEach(a => a.cancel());
      $('hub-pack-status').textContent = 'Seu pacote está selado. Toque nele para abrir!';
      $('hub-paste-pack').disabled = true; $('hub-reveal-all').disabled = true;
      dialog.style.setProperty('--season', collection.color); dialog.showModal();
    }
    function burstPack() {
      const sealedPack = $('hub-pack-open');
      const cardsEl = $('hub-pack-cards');
      if (!packResult || !sealedPack || sealedPack.classList.contains('is-burst')) return;
      sealedPack.classList.add('is-burst');
      playPackMusic();

      // Explosão de faíscas saindo do pacote
      const stage = $('hub-pack-stage');
      if (stage) {
        for (let i = 0; i < 18; i++) {
          const spark = document.createElement('span');
          spark.className = 'pack-spark-particle';
          const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
          const dist = 90 + Math.random() * 140;
          spark.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
          spark.style.setProperty('--ty', `${Math.sin(angle) * dist - 40}px`);
          spark.style.setProperty('--rot', `${Math.random() * 260 - 130}deg`);
          stage.appendChild(spark);
          setTimeout(() => spark.remove(), 1100);
        }
      }

      // O pacote incha, treme e explode
      if (sealedPack.animate) {
        sealedPack.animate([
          { transform: 'rotateX(8deg) rotateY(-12deg) scale(1)' },
          { transform: 'rotateX(0deg) rotateY(0deg) scale(1.18) rotate(2deg)', offset: 0.35 },
          { transform: 'scale(1.6) rotate(-4deg)', opacity: 1, offset: 0.7 },
          { transform: 'scale(2.15) rotate(3deg)', opacity: 0 }
        ], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      }

      // As cartas voam para fora em 3D, uma de cada vez
      setTimeout(() => {
        sealedPack.hidden = true;
        playSfx(PACK_SFX_URLS.incoming); // efeito das cartas vindo
        cardsEl.classList.remove('is-sealed'); cardsEl.classList.add('is-open');
        cardsEl.querySelectorAll('[data-reveal]').forEach((cardEl, i) => {
          if (!cardEl.animate) return;
          cardEl.animate([
            { transform: 'translateY(52px) scale(.5) rotateY(75deg) rotateX(16deg)', opacity: 0 },
            { transform: 'translateY(-12px) scale(1.05) rotateY(-9deg)', opacity: 1, offset: 0.65 },
            { transform: 'translateY(0) scale(1) rotateY(0deg) rotateX(0deg)', opacity: 1 }
          ], { duration: 760, delay: i * 160, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'backwards' });
        });
        $('hub-reveal-all').disabled = false;
        $('hub-pack-status').textContent = '💥 O pacote abriu! Toque em cada carta para revelar.';
      }, 480);
    }
    function revealAll() {
      // Uma de cada vez, para cada som de raridade tocar limpo
      dialog.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((button, i) => {
        setTimeout(() => reveal(button), i * 240);
      });
    }
    function reveal(button) {
      if (!packResult || button.classList.contains('is-revealed')) return;
      const card = packResult.draws[Number(button.dataset.reveal)];
      button.classList.add('is-revealed');
      playSfx(PACK_SFX_URLS[card.rarity]); // som da raridade da carta
      button.setAttribute('aria-label', `${card.name}, ${rarities[card.rarity].name}, ${card.duplicate ? `repetida: ${card.fragments} fragmentos` : 'nova carta'}`);
      const all = [...dialog.querySelectorAll('[data-reveal]')].every(b => b.classList.contains('is-revealed'));
      if (all) {
        $('hub-paste-pack').disabled = false; $('hub-reveal-all').disabled = true;
        const fragments = packResult.draws.reduce((n, c) => n + c.fragments, 0);
        $('hub-pack-status').textContent = `${packResult.draws.filter(c => !c.duplicate).length} cartas novas${fragments ? ` e ${fragments} fragmentos` : ''}. Sua aventura continua!`;
      }
    }

    modal.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.action, id = button.dataset.id;
      const collection = book();
      if (action === 'export-gif') window.cardStudio.openExport(collection);
      else if (action === 'go-album') setTab('album', true);
      else if (action === 'go-rewards') setTab('rewards', true);
      else if (action === 'open-pack') openPack();
      else if (action === 'prev-page' || action === 'next-page' || action === 'category') {
        page = action === 'category' ? Number(id) * 2 : Math.max(0, Math.min(5, page + (action === 'next-page' ? 1 : -1)));
        render(); $('album-page-title').focus({ preventScroll: true });
      } else if (action === 'paste') {
        if (run(() => engine.pasteCard(collection.key, id))) {
          notice('Mais uma história colada no seu álbum. ✦');
          modal.querySelector(`[data-card="${id}"]`)?.classList.add('just-pasted');
          $('album-page-title').focus({ preventScroll: true });
        }
      } else if (action === 'craft') {
        if (run(() => { engine.craftCard(collection.key, id); return true; })) {
          notice('Carta criada! Agora é só colar no álbum.');
          modal.querySelector(`[data-action="paste"][data-id="${id}"]`)?.focus({ preventScroll: true });
        }
      } else if (action === 'claim') {
        const reward = run(() => engine.claimReward(collection.key, id));
        if (reward) { notice(`Prêmio resgatado: ${reward.name}! +${reward.fragments} fragmentos.`); modal.querySelector(`[data-action="equip"][data-id="${id}"]`)?.focus({ preventScroll: true }); }
      } else if (action === 'equip' || action === 'equip-archive') {
        run(() => { engine.equipReward(button.dataset.season || collection.key, id); notice('Uma conquista para exibir com orgulho.'); $('hub-tab-rewards').focus({ preventScroll: true }); });
      } else if (action === 'retry-achievements') {
        achievements.loadPromise = null;
        achievements.refresh().then(render);
      }
    });
    $('hub-album').addEventListener('change', event => {
      if (event.target.id !== 'hub-season-select') return;
      selectedSeason = event.target.value; page = 0; render(); $('hub-season-select').focus();
    });
    document.querySelector('.hub-tabs').addEventListener('click', event => {
      const button = event.target.closest('[data-hub-tab]'); if (button) setTab(button.dataset.hubTab);
    });
    document.querySelector('.hub-tabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = ['achievements', 'album', 'rewards']; let i = tabs.indexOf(tab);
      i = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      event.preventDefault(); setTab(tabs[i], true);
    });
    $('achievements-filter').addEventListener('click', event => {
      const button = event.target.closest('[data-filter]'); if (!button) return;
      filter = button.dataset.filter;
      $('achievements-filter').querySelectorAll('button').forEach(b => { b.classList.toggle('is-active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
      render();
    });
    $('hub-home').addEventListener('click', event => { event.preventDefault(); setTab('achievements', true); });
    $('achievements-fab').addEventListener('click', open);
    $('achievements-silent-toast-open').addEventListener('click', () => { open(); if (engine.snapshot().packs) setTab('album'); });
    $('close-achievements-modal').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
      if (dialog.open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not(:disabled), a[href], input, select, summary, [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    $('achievements-mark-seen').addEventListener('click', () => achievements.markAllSeen());
    $('achievements-sound-toggle').addEventListener('change', event => achievements.setSoundEnabled(event.target.checked));
    $('hub-pack-close').addEventListener('click', () => dialog.close());
    $('hub-pack-open').addEventListener('click', burstPack);
    dialog.addEventListener('close', () => { stopPackMusic(); packResult = null; packProfile = null; if (modal.style.display === 'flex') modal.querySelector('[data-action="open-pack"]')?.focus(); });
    dialog.addEventListener('click', event => { const button = event.target.closest('[data-reveal]'); if (button) reveal(button); });
    $('hub-reveal-all').addEventListener('click', revealAll);
    $('hub-paste-pack').addEventListener('click', () => {
      if (!packResult || packProfile !== engine.profileId()) { dialog.close(); return; }
      const result = run(() => {
        packResult.draws.filter(card => !card.duplicate).forEach(card => engine.pasteCard(packResult.key, card.id, packProfile));
        return true;
      });
      if (result) { selectedSeason = packResult.key; page = packResult.draws[0].page; dialog.close(); setTab('album', true); notice('Suas novas cartas estão no álbum. Que venham as próximas!'); }
    });
    window.addEventListener('achievements:updated', () => run(render));
    window.addEventListener('collection:updated', () => run(render));
    window.addEventListener('card-art:updated', () => run(render));
    window.cardStudio.load().then(() => run(render));
    window.addEventListener('collection:error', event => { notice(event.detail.message, true); $('achievements-silent-toast-text').textContent = event.detail.message; $('achievements-silent-toast').style.display = 'flex'; });
    window.addEventListener('aniverse:profile-changed', () => {
      clearTimeout(noticeTimer); $('hub-notice').hidden = true;
      $('achievements-audio')?.pause();
      dialog.close(); selectedSeason = null; page = 0; achievements.refresh({ eventType: 'app_open' }).then(() => run(render));
    });
    window.addEventListener('storage', event => { if (event.key?.startsWith('aniverse:collection:') || event.key?.startsWith('aniVerseAchievementsState:')) run(render); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) run(render); });
    achievements.loadData().then(() => achievements.refresh({ eventType: 'app_open' })).then(() => run(render));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
