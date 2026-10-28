/* Salas do AniVerse: um vídeo por aparelho, comandos validados no servidor. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const player = document.getElementById('anime-player');
  const container = document.getElementById('video-player-container');
  const toggle = document.getElementById('watch-party-toggle');
  if (!player || !container || !toggle || !window.io) return;
  const panel = document.createElement('section');
  panel.id = 'watch-party-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Assistir junto');
  panel.innerHTML = `<header class="party-heading"><div><span class="party-eyebrow">SESSÃO COM AMIGOS</span><h3>Assistir junto</h3></div><button type="button" id="party-close" aria-label="Fechar painel">×</button></header>
    <div id="party-network" class="party-network" data-state="offline" role="status"><span id="party-online">Desconectado</span><span id="party-latency" title="Tempo de ida e volta até o servidor da sala">— ms</span></div>
    <section id="party-server-wait" class="party-server-wait" hidden aria-labelledby="party-wait-title">
      <div class="party-wait-heading"><span class="party-wait-spinner" aria-hidden="true"></span><strong id="party-wait-title" role="status" aria-live="polite">Conectando ao servidor…</strong></div>
      <p id="party-wait-message">O servidor pode estar iniciando. Aguarde um pouco; vamos tentar conectar automaticamente.</p>
      <p id="party-wait-elapsed" aria-live="off"></p>
      <button type="button" id="party-wait-cancel" class="party-secondary">Cancelar conexão</button><button type="button" id="party-wait-retry" hidden>Tentar novamente</button>
    </section>
    <p id="party-status" role="status" aria-live="polite">Crie uma sala para este episódio ou entre pelo convite de um amigo.</p>
    <p id="party-video-status" class="party-help" hidden></p>
    <div id="party-entry"><form id="party-create"><label>Nome da sala<input id="party-name" maxlength="60" placeholder="Uma sessão de anime"></label><button type="submit">Criar sala deste episódio</button></form>
    <form id="party-join"><label>Convite ou código<input id="party-code" required placeholder="Cole o convite aqui" autocomplete="off"></label><button type="submit" class="party-secondary">Entrar na sala</button></form></div>
    <div id="party-session" hidden><div class="party-session-heading"><h4 id="party-room-name"></h4><span id="party-role"></span></div>
    <div class="party-actions"><button type="button" id="party-invite">Copiar convite</button><button type="button" id="party-ready" class="party-secondary">Estou pronto</button><button type="button" id="party-leave" class="party-secondary">Sair</button></div>
    <p class="party-help">O anfitrião controla o episódio. Som e tela cheia são individuais. Confira quem está pronto antes de iniciar.</p>
    <div id="party-suggestions"></div><button type="button" id="party-suggest-open" class="party-secondary">Sugerir anime</button><button type="button" id="party-change-open" class="party-secondary">Trocar anime</button>
    <section id="party-catalog" hidden><label>Buscar anime<input type="search" id="party-catalog-search" placeholder="Nome do anime…"></label><div id="party-catalog-list"></div></section>
    <ul id="party-members" aria-label="Participantes"></ul><h4>Conversa da sala</h4><div id="party-chat" role="log" aria-live="polite" aria-label="Mensagens"></div>
    <form id="party-chat-form"><label class="party-sr-only" for="party-message">Mensagem</label><input id="party-message" maxlength="500" required placeholder="Converse com a sala…" autocomplete="off"><button type="submit">Enviar</button></form></div>`;
  container.appendChild(panel);
  const el = id => document.getElementById(id);
  const profile = () => window.profileManager?.getActiveProfile?.();
  let socket, room = null, wantedRoom = '', joining = false, openingRemote = false;
  let ignoreUntil = 0, changing = false, offset = 0, busy = false, profileId = null;
  let browsing = false;
  let lastSeekAt = 0, alignedRevision = -1;
  let joinNeedsSource = false;
  let hostBuffering = false;
  let connectionTask = null, connectionAbort = null, lastOperation = null;
  let warmupStarted = false, warmupQueued = false;
  const warmupAbort = new AbortController();
  const serverBadge = document.createElement('div');
  serverBadge.id = 'party-server-badge'; serverBadge.setAttribute('role','status');
  serverBadge.setAttribute('aria-live','polite'); serverBadge.hidden = !window.ANIVERSE_WATCH_SERVER;
  document.body.appendChild(serverBadge);
  let serverProbe;
  function serverState(state) {
    if (navigator.onLine === false) state = 'offline';
    else if (serverProbe?.connected) state = 'online';
    serverBadge.dataset.state = state;
    serverBadge.textContent = state === 'online' ? 'Servidor online' : state === 'starting' ? 'Servidor iniciando…' : 'Servidor indisponível';
  }
  serverState(navigator.onLine === false ? 'offline' : 'starting');
  function checkServer() {
    serverState('starting');
    window.warmPartyServer(window.ANIVERSE_WATCH_SERVER,{signal:warmupAbort.signal});
    // Keep a lightweight connection without joining a room. Socket.IO retries until the server returns.
    serverProbe = io(window.ANIVERSE_WATCH_SERVER,{autoConnect:false,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:2000,reconnectionDelayMax:15000,timeout:15000});
    serverProbe.on('connect',()=>serverState('online'));
    serverProbe.on('connect_error',()=>serverState('starting'));
    serverProbe.on('disconnect',reason=>{
      if (warmupAbort.signal.aborted) return;
      serverState('starting');
      if (reason === 'io server disconnect' && navigator.onLine !== false) serverProbe.connect();
    });
    serverProbe.connect();
  }
  function scheduleWarmup() {
    if (warmupStarted || warmupQueued || !window.ANIVERSE_WATCH_SERVER || navigator.onLine === false || document.hidden) return;
    warmupQueued = true;
    const start = () => {
      warmupQueued = false;
      if (warmupStarted || warmupAbort.signal.aborted || navigator.onLine === false || document.hidden) return;
      warmupStarted = true;
      document.removeEventListener('visibilitychange',scheduleWarmup);
      checkServer();
    };
    if (window.requestIdleCallback) requestIdleCallback(start,{timeout:1500}); else setTimeout(start,300);
  }
  function resumeServer() {
    scheduleWarmup();
    if (serverProbe && !serverProbe.connected && !warmupAbort.signal.aborted) { serverState('starting'); serverProbe.connect(); }
  }
  window.addEventListener('online',resumeServer);
  window.addEventListener('offline',()=>{serverProbe?.disconnect();serverState('offline');});
  document.addEventListener('visibilitychange',scheduleWarmup);
  const sessionBar = document.createElement('div');
  sessionBar.className = 'party-session-bar'; sessionBar.hidden = true;
  sessionBar.innerHTML = '<span id="party-bar-title"></span><span id="party-bar-status" role="status"></span><button type="button" id="party-return">Voltar à sala</button><button type="button" id="party-browse">Escolher anime</button><button type="button" id="party-bar-leave">Sair</button>';
  document.body.appendChild(sessionBar);
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const endpoint = window.ANIVERSE_WATCH_SERVER || (local ? `${location.protocol}//${location.hostname}:3001` : '');
  function status(message) { el('party-status').textContent = message; el('party-bar-status').textContent = message; }
  const desktop = matchMedia('(min-width: 1100px)');
  function fullscreen() { return document.fullscreenElement === container || document.webkitFullscreenElement === container || container.classList.contains('is-fullscreen'); }
  function docked() { return panel.parentElement?.id === 'party-dock'; }
  function layoutPanel() {
    const target = fullscreen() ? container : el('party-dock');
    if (target && panel.parentElement !== target) { target.appendChild(panel); panel.hidden = fullscreen() || !room; }
    if (room && docked() && desktop.matches) panel.hidden = false;
    el('party-close').hidden = !!room && docked() && desktop.matches;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  }
  function show(value) {
    if (room && docked() && desktop.matches) value = true;
    panel.hidden = !value; toggle.setAttribute('aria-expanded', String(value));
    if (value) (el('party-close').hidden ? el('party-message') : el('party-close')).focus({ preventScroll: true });
  }
  function network(state, milliseconds) {
    if (state !== 'offline') serverState(state === 'online' ? 'online' : 'starting');
    el('party-network').dataset.state = state;
    el('party-online').textContent = state === 'online' ? 'Online' : state === 'connecting' ? 'Conectando…' : 'Desconectado';
    el('party-latency').textContent = Number.isFinite(milliseconds) ? `${Math.round(milliseconds)} ms` : '— ms';
  }
  function connectionNotice(state, elapsedSeconds = 0) {
    const card = el('party-server-wait'); card.hidden = state === 'connected' || state === 'hidden'; card.dataset.state = state;
    const pending = state === 'pending';
    el('party-wait-cancel').hidden = !pending; el('party-wait-retry').hidden = pending;
    el('party-wait-elapsed').textContent = pending ? `Aguardando há ${elapsedSeconds}s · conexão automática` : '';
    for (const button of el('party-entry').querySelectorAll('button')) button.disabled = pending;
    if (state === 'pending') {
      const offline = navigator.onLine === false;
      const title = offline ? 'Você está sem conexão' : elapsedSeconds >= 10 ? 'Aguardando o servidor iniciar…' : 'Conectando ao servidor…';
      if (el('party-wait-title').textContent !== title) el('party-wait-title').textContent = title;
      el('party-wait-message').textContent = offline ? 'Verifique sua internet. Continuaremos tentando enquanto você aguarda.' : elapsedSeconds >= 60 ? 'Ainda não recebemos resposta. Você pode aguardar mais um pouco ou cancelar.' : 'O servidor gratuito pode estar iniciando. Isso pode levar cerca de um minuto. Vamos conectar automaticamente assim que ele responder.';
    } else if (state === 'cancelled') {
      el('party-wait-title').textContent = 'Conexão cancelada'; el('party-wait-message').textContent = 'Você pode continuar assistindo ou tentar entrar na sala novamente.';
    } else if (state === 'failed') {
      el('party-wait-title').textContent = 'Não foi possível conectar agora'; el('party-wait-message').textContent = 'O servidor pode estar indisponível ou sua conexão pode ter falhado. Tente novamente em alguns instantes.';
    }
  }
  function revealConnection() {
    const modal = el('video-modal');
    if (getComputedStyle(modal).display === 'none') {
      window.__videoModalPreviousOverflow = document.body.style.overflow; window.__videoModalPreviousFocus = document.activeElement;
      modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden';
    }
    show(true);
  }
  document.addEventListener('fullscreenchange', layoutPanel);
  document.addEventListener('webkitfullscreenchange', layoutPanel);
  desktop.addEventListener('change', layoutPanel);
  new MutationObserver(layoutPanel).observe(container, { attributes: true, attributeFilter: ['class'] });
  layoutPanel();
  function host() { return room && room.host === socket?.id; }
  function ready() { return room?.members.find(member => member.id === socket?.id)?.ready; }
  function selection() { const current = window.currentWatchingAnime; return current && { anime: String(current.id), season: current.season, episode: current.episode }; }
  function matches(state) { const current = selection(); return current && current.anime === state.anime && current.season === state.season && current.episode === state.episode; }
  function request(event, data = {}) {
    if (!socket?.connected) return Promise.reject(new Error('Sem conexão com o servidor de salas.'));
    const start = performance.now(), sent = Date.now();
    return socket.timeout(5000).emitWithAck(event, data).then(result => {
      network('online', performance.now() - start);
      if (!result.ok) throw new Error(result.error);
      if (result.room) offset = result.room.state.updatedAt - (sent + Date.now()) / 2;
      return result;
    });
  }
  async function connect() {
    if (!endpoint) throw new Error('O servidor de salas online ainda não foi configurado.');
    if (!socket) {
      socket = io(endpoint, { autoConnect: false, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
      socket.on('room:state', update);
      socket.on('chat:message', message => { if (room) { room.messages.push(message); room.messages = room.messages.slice(-50); renderChat(); } });
      socket.on('disconnect', reason => {
        network('offline');
        if (reason !== 'io client disconnect') serverState(room ? 'starting' : 'offline');
        if (room) { ignoreUntil = Date.now() + 1000; player.pause(); player.playbackRate = 1; status('Conexão perdida. Reprodução pausada; tentando voltar à sala…'); }
        if (room && reason !== 'io client disconnect' && !connectionTask) connect().catch(error => { if (!error.silent) status(error.message); });
      });
      socket.on('connect', () => { network('online'); if (room && wantedRoom && !joining) enter(wantedRoom).catch(error => { status(error.message); clearRoom(); }); });
      socket.on('connect_error', () => { if (connectionTask) network('connecting'); else { network('offline'); serverState('offline'); } });
    }
    if (socket.connected) return;
    if (connectionTask) return connectionTask;
    connectionAbort = new AbortController();
    network('connecting'); if (!browsing) revealConnection();
    connectionTask = window.waitForPartyConnection(socket, {
      signal:connectionAbort.signal,
      onProgress:progress => connectionNotice('pending',progress.elapsedSeconds)
    }).then(() => connectionNotice('connected')).catch(error => {
      if (error.code !== 'CONNECTION_CANCELLED') serverState('offline');
      network('offline'); connectionNotice(error.silent ? 'hidden' : error.code === 'CONNECTION_CANCELLED' ? 'cancelled' : 'failed'); throw error;
    }).finally(() => { connectionTask = null; connectionAbort = null; });
    requestAnimationFrame(() => { if (!el('party-server-wait').hidden && !browsing) el('party-server-wait').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}); });
    return connectionTask;
  }
  function renderChat() {
    const chat = el('party-chat'), nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 60;
    chat.replaceChildren();
    for (const message of room?.messages || []) {
      const line = document.createElement('p'), name = document.createElement('strong'); name.textContent = `${message.name}: `;
      line.append(name, document.createTextNode(message.message)); chat.appendChild(line);
    }
    if (nearBottom) chat.scrollTop = chat.scrollHeight;
  }
  function render() {
    sessionBar.hidden = !room || !browsing;
    if (room) el('party-bar-title').textContent = room.name;
    layoutPanel();
    el('party-entry').hidden = !!room; el('party-session').hidden = !room;
    toggle.classList.toggle('party-connected', !!room);
    if (!room) return;
    el('party-room-name').textContent = room.name;
    el('party-role').textContent = host() ? 'Você é o anfitrião' : 'Você está acompanhando';
    el('party-suggest-open').hidden = !!host(); el('party-change-open').hidden = !host();
    el('party-browse').textContent = host() ? 'Trocar anime' : 'Sugerir anime';
    el('party-ready').textContent = ready() ? 'Pronto ✓' : 'Estou pronto';
    el('party-ready').setAttribute('aria-pressed', String(!!ready()));
    const list = el('party-members'); list.replaceChildren();
    for (const member of room.members) {
      const item = document.createElement('li'), name = document.createElement('span');
      name.textContent = `${member.name}${member.id === room.host ? ' · Anfitrião' : ''}${member.id === socket.id ? ' · Você' : ''}`;
      const state = document.createElement('small'); state.textContent = member.ready ? 'Pronto' : 'Aguardando'; item.append(name, state);
      if (host() && member.id !== socket.id) {
        const transfer = document.createElement('button'); transfer.type = 'button'; transfer.textContent = 'Passar controle';
        transfer.addEventListener('click', () => request('room:transfer', { participant: member.id }).catch(error => status(error.message)));
        item.appendChild(transfer);
      }
      list.appendChild(item);
    }
    renderChat();
    const suggestions = el('party-suggestions'); suggestions.replaceChildren();
    for (const suggestion of room.suggestions || []) {
      const anime = window.animeDB?.animes.find(anime => String(anime.id) === suggestion.anime);
      const item = document.createElement('div'); item.className = 'party-suggestion';
      const text = document.createElement('p'); text.textContent = `${suggestion.name} sugeriu ${anime?.title || 'um anime'} · T${suggestion.season} E${suggestion.episode}`;
      item.appendChild(text);
      if (host()) for (const [label, event] of [['Assistir', 'room:suggestion:accept'], ['Dispensar', 'room:suggestion:remove']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        button.addEventListener('click', () => { if (event === 'room:suggestion:accept') browsing = false; request(event, { id: suggestion.id }).catch(error => status(error.message)); }); item.appendChild(button);
      }
      suggestions.appendChild(item);
    }
  }
  function update(next) {
    if (room && next.id === room.id && next.state.revision < room.state.revision) return;
    if (room && next.id === room.id && next.state.revision === room.state.revision && next.state.updatedAt < room.state.updatedAt) return;
    if (room && ['anime', 'season', 'episode'].some(key => next.state[key] !== room.state[key])) browsing = false;
    room = next; wantedRoom = next.id; render(); sync();
  }
  function sync(force = false) {
    if (!room || !socket?.connected || browsing || changing) return;
    const state = room.state;
    if (player.__adaptivePlayback && (!state.playing || !ready())) player.__adaptivePlayback.playWhenReady = false;
    if (joinNeedsSource || !matches(state) || !player.getAttribute('src')) {
      const anime = window.animeDB?.animes.find(anime => String(anime.id) === state.anime);
      if (!anime || !anime.seasons?.find(season => season.number === state.season)?.episodes?.[state.episode - 1]) { status('Este episódio não está disponível no seu catálogo.'); return; }
      joinNeedsSource = false; openingRemote = true; ignoreUntil = Date.now() + 1500;
      lastSeekAt = 0; alignedRevision = -1;
      try { window.openEpisode(anime, state.season, state.episode - 1, { skipResume: true }); } finally { openingRemote = false; }
      return;
    }
    // Joining members never reposition or pause the host's local player.
    if (host()) return;
    if (!state.playing || !ready() || player.seeking || player.readyState < 2) {
      player.pause(); player.playbackRate = 1;
    }
    if (player.readyState < 1 || changing) return;
    const target = state.position + (state.playing ? Math.max(0, (Date.now() + offset - state.updatedAt) / 1000) : 0);
    const end = Number.isFinite(player.duration) ? Math.max(0, player.duration - .1) : target;
    const difference = Math.min(target, end) - player.currentTime;
    ignoreUntil = Date.now() + 1000;
    if (Math.abs(difference) > 1.5 || (!state.playing && Math.abs(difference) > .05)) {
      const destination = Math.max(0, Math.min(target, end));
      // currentTime may request an uncached range. Waiting for it to be seekable first
      // left guests playing the old scene while the host was already elsewhere.
      if (!player.seeking && (alignedRevision !== state.revision || Date.now() - lastSeekAt > 8000)) {
        player.pause();
        lastSeekAt = Date.now(); alignedRevision = state.revision;
        try { player.currentTime = destination; }
        catch (_) { el('party-video-status').hidden = false; el('party-video-status').textContent = 'Não foi possível avançar até o ponto da sala nesta fonte. Tentaremos sincronizar novamente.'; }
      }
      if (player.seeking || Math.abs(player.currentTime - destination) > 1.5) { player.pause(); player.playbackRate = 1; return; }
    }
    if (!ready()) { player.pause(); player.playbackRate = 1; return; }
    player.playbackRate = state.playing && player.readyState >= 3 && Math.abs(difference) > .35 && Math.abs(difference) <= 1.5 ? (difference > 0 ? 1.02 : .98) : 1;
    if (state.playing && player.paused && player.readyState >= 2 && !player.seeking) player.play().catch(() => status('Toque em “Pronto ✓” para liberar a reprodução neste navegador.'));
    if (!state.playing && !player.paused) player.pause();
  }
  function saveInvite(id) { const url = new URL(location.href); if (id) url.searchParams.set('room', id); else url.searchParams.delete('room'); history.replaceState(history.state, '', url); }
  function clearRoom() { connectionAbort?.abort('silent'); connectionNotice('hidden'); room = null; browsing = false; wantedRoom = ''; profileId = null; player.playbackRate = 1; saveInvite(''); render(); }
  async function enter(id) {
    if (!profile()) throw new Error('Escolha seu perfil para entrar na sala.');
    joining = true; joinNeedsSource = true;
    try {
      await connect(); const sent = Date.now();
      const result = await request('room:join', { id, participantName: profile().name });
      offset = result.room.state.updatedAt - (sent + Date.now()) / 2;
      profileId = profile().id; update(result.room); saveInvite(id); show(true);
      status('Você entrou no ponto atual da sala. Clique em “Estou pronto” para acompanhar a reprodução.');
    } finally { joining = false; }
  }
  async function action(task) { if (busy) return; busy = true; lastOperation = task; try { await task(); } catch (error) { if (!error.silent) status(error.message); } finally { busy = false; } }
  el('party-wait-cancel').addEventListener('click', () => connectionAbort?.abort());
  el('party-wait-retry').addEventListener('click', () => action(room ? () => connect() : lastOperation || (() => connect())));
  toggle.addEventListener('click', () => show(panel.hidden)); el('party-close').addEventListener('click', () => { show(false); toggle.focus(); });
  container.addEventListener('click', event => {
    if (!room || host() || panel.contains(event.target)) return;
    if (event.target.closest('#play-pause-btn, .timeline-container, #next-episode-btn, #skip-opening-btn, #skip-ending-btn, #video-floating-actions, #tap-zone-center')) {
      event.preventDefault(); event.stopImmediatePropagation(); status('O anfitrião controla a reprodução.');
    }
  }, true);
  el('close-video')?.addEventListener('click', () => {
    if (!room) { connectionAbort?.abort('silent'); return; }
    browsing = true;
    if (host() && socket?.connected) request('playback:update', { position: player.currentTime || 0, playing: false }).catch(error => status(error.message));
    status(host() ? 'Escolha outro anime no catálogo. A sala continua aberta.' : 'Você pode sugerir um anime ao anfitrião.'); render();
  }, true);
  el('party-return').addEventListener('click', () => { browsing = false; render(); sync(true); });
  el('party-bar-leave').addEventListener('click', () => el('party-leave').click());
  function renderCatalog() {
    const list = el('party-catalog-list'), query = el('party-catalog-search').value.trim().toLocaleLowerCase('pt-BR'); list.replaceChildren();
    for (const anime of window.animeDB?.animes || []) {
      if (!anime.title.toLocaleLowerCase('pt-BR').includes(query)) continue;
      const season = anime.seasons?.find(season => season.episodes?.length); if (!season) continue;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = anime.title;
      button.addEventListener('click', () => { if (host()) window.openEpisode(anime, season.number, 0); else suggest(anime, season.number, 0); el('party-catalog').hidden = true; });
      list.appendChild(button);
    }
    if (!list.childElementCount) list.textContent = 'Nenhum anime encontrado.';
  }
  function openCatalog() {
    if (!room) return;
    if (browsing) { browsing = false; render(); sync(true); }
    show(true); el('party-catalog').hidden = false; renderCatalog(); el('party-catalog-search').focus();
  }
  el('party-browse').addEventListener('click', openCatalog);
  el('party-suggest-open').addEventListener('click', openCatalog);
  el('party-change-open').addEventListener('click', openCatalog);
  el('party-catalog-search').addEventListener('input', renderCatalog);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); show(false); toggle.focus(); } });
  el('party-create').addEventListener('submit', event => { event.preventDefault(); action(async () => {
    if (!profile()) throw new Error('Escolha um perfil antes de criar a sala.');
    if (!selection()) throw new Error('Abra um episódio primeiro.');
    await connect(); joining = true;
    try { const sent = Date.now(); const result = await request('room:create', { ...selection(), position: player.currentTime || 0, playing: !player.paused && !player.ended, name: el('party-name').value, participantName: profile().name });
      offset = result.room.state.updatedAt - (sent + Date.now()) / 2;
      profileId = profile().id; update(result.room); saveInvite(room.id); status('Sala criada. Copie o convite e clique em “Estou pronto”.');
    } finally { joining = false; }
  }); });
  el('party-join').addEventListener('submit', event => { event.preventDefault(); action(async () => {
    const value = el('party-code').value.trim(); let id = value;
    try { id = new URL(value).searchParams.get('room') || ''; } catch (_) {}
    if (!/^[a-f0-9]{24}$/.test(id)) throw new Error('Cole um convite ou código válido.');
    await enter(id);
  }); });
  el('party-invite').addEventListener('click', () => action(async () => {
    if (!room) return; const url = new URL(location.href); url.searchParams.set('room', room.id);
    try { await navigator.clipboard.writeText(url.href); status('Convite copiado.'); } catch (_) { prompt('Copie o convite:', url.href); }
  }));
  el('party-ready').addEventListener('click', () => action(async () => {
    if (!matches(room.state) || player.readyState < 2) throw new Error('Espere o episódio carregar antes de ficar pronto.');
    await request('room:ready', { ready: true });
    sync(true); status(host() ? 'Pronto. Inicie o episódio pelos controles quando todos estiverem prontos.' : 'Pronto. Você acompanha a reprodução do anfitrião.');
  }));
  el('party-leave').addEventListener('click', () => action(async () => { try { await request('room:leave'); } finally { clearRoom(); status('Você saiu da sala.'); } }));
  el('party-chat-form').addEventListener('submit', event => { event.preventDefault(); action(async () => { const input = el('party-message'); await request('chat:send', { message: input.value }); input.value = ''; }); });
  function localChange(event) {
    if (!room || openingRemote || browsing) return;
    if (!socket?.connected || !ready()) { ignoreUntil = Date.now() + 500; if (!player.paused) player.pause(); return; }
    if (!host()) { if (Date.now() >= ignoreUntil) sync(true); return; }
    if (changing || !matches(room.state) || player.readyState < 1) return;
    if (event?.type === 'waiting') hostBuffering = !player.paused;
    if (event?.type === 'playing' || event?.type === 'pause' || event?.type === 'seeked') hostBuffering = false;
    // Publish pause and the new timestamp even while seeking/buffering; never
    // let the other players keep running at the previous position.
    request('playback:update', { position: player.currentTime, playing: !player.paused && !player.ended && !player.seeking && !hostBuffering && player.readyState >= 3 }).catch(error => status(error.message));
  }
  for (const event of ['play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'ended']) player.addEventListener(event, localChange);
  player.addEventListener('seeked', () => { if (room && !host()) sync(true); });
  player.addEventListener('loadedmetadata', () => sync(true));
  player.addEventListener('loadeddata', () => sync());
  player.addEventListener('canplay', () => sync());
  player.addEventListener('error', () => { if (room) { el('party-video-status').hidden = false; el('party-video-status').textContent = 'A sala está conectada, mas este aparelho não conseguiu carregar a fonte do episódio. Pode ser indisponibilidade, bloqueio ou formato incompatível.'; } });
  player.addEventListener('canplay', () => { el('party-video-status').hidden = true; });
  window.addEventListener('aniverse:episode-opened', () => {
    if (!room || openingRemote || !host()) return;
    changing = true; hostBuffering = false;
    request('playback:episode', selection()).then(result => update(result.room)).catch(error => status(error.message)).finally(() => { changing = false; sync(true); });
  });
  setInterval(() => { if (room && socket?.connected && !changing) request('room:get').then(result => update(result.room)).catch(error => status(error.message)); }, 5000);
  setInterval(() => { if (room && host() && !browsing && !changing) localChange(); }, 3000);
  async function suggest(anime, season, index) {
    try { await request('room:suggest', { anime: String(anime.id), season, episode: index + 1 }); status(`Sugestão enviada: ${anime.title}. O anfitrião decide quando trocar.`); }
    catch (error) { status(error.message); }
  }
  window.watchParty = {
    get active() { return !!room; }, get isHost() { return !!host(); }, suggest,
    canOpenEpisode: (anime, season, index) => {
      const allowed = !room || openingRemote || !!host();
      if (!allowed && anime) suggest(anime, season, index);
      if (allowed && !openingRemote) { browsing = false; render(); }
      return allowed;
    }
  };
  const pending = new URL(location.href).searchParams.get('room');
  let inviteJoined = false;
  function tryInvite() { if (!inviteJoined && !joining && /^[a-f0-9]{24}$/.test(pending || '') && profile() && window.animeDB?.animes.length) { inviteJoined = true; action(() => enter(pending)); } }
  window.addEventListener('animeDataLoaded', tryInvite);
  window.addEventListener('aniverse:profile-changed', () => { if (room && profile()?.id !== profileId) { socket?.disconnect(); clearRoom(); } setTimeout(tryInvite, 0); });
  window.addEventListener('pagehide', () => { warmupAbort.abort(); serverProbe?.disconnect(); window.removeEventListener('online',resumeServer); document.removeEventListener('visibilitychange',scheduleWarmup); socket?.disconnect(); });
  tryInvite();
  scheduleWarmup();
});
