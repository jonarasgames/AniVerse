(function (root) {
  'use strict';

  const RULES = Object.freeze({ episodePoints: 100, packCost: 300, packSize: 3, launchSeason: '2026-11' });
  const RARITIES = Object.freeze({
    common: { name: 'Comum', dust: 10, cost: 30 },
    rare: { name: 'Rara', dust: 20, cost: 60 },
    epic: { name: 'Épica', dust: 40, cost: 120 },
    legendary: { name: 'Lendária', dust: 80, cost: 240 }
  });
  // November 2026 opens the cycle. Every calendar month has its own saved album.
  const THEMES = [
    { id: 'pirates', renderFolder: 'Piratas', name: 'A era dos piratas', tag: 'O horizonte é só o começo.', icon: 'ship', color: '#64e1c5', groups: [
      ['Tripulação', 'compass', ['Aprendiz do convés', 'Vigia das estrelas', 'Cartógrafa das marés', 'Capitã Aurora', 'Mestre das velas', 'Guardiã do leme', 'Corsário da névoa', 'Rei dos sete mares']],
      ['Alto-mar', 'ship', ['Porto do amanhecer', 'Ilha dos ventos', 'Baía esmeralda', 'Navio fantasma', 'Maré de prata', 'Farol do norte', 'Tempestade azul', 'Pérola do horizonte']],
      ['Tesouros', 'gem', ['Moeda antiga', 'Garrafa à deriva', 'Mapa secreto', 'Bússola lunar', 'Chave de coral', 'Coroa submersa', 'Baú encantado', 'Coração do oceano']]
    ] },
    { id: 'cosmos', renderFolder: 'Cosmos', name: 'Além das estrelas', tag: 'Um universo inteiro para descobrir.', icon: 'planet', color: '#a9a0ff', groups: [
      ['Exploradores', 'compass', ['Cadete lunar', 'Piloto solar', 'Guardiã orbital', 'Almirante Nova', 'Robô mensageiro', 'Astrônoma azul', 'Viajante do tempo', 'Primeiro contato']],
      ['Galáxias', 'planet', ['Lua violeta', 'Cometa azul', 'Anéis de gelo', 'Nebulosa viva', 'Sol de cristal', 'Planeta oceano', 'Portal estelar', 'Origem do universo']],
      ['Relíquias', 'gem', ['Poeira cósmica', 'Fragmento lunar', 'Cristal de plasma', 'Motor infinito', 'Rádio perdido', 'Mapa galáctico', 'Núcleo quântico', 'Estrela eterna']]
    ] },
    { id: 'spirits', renderFolder: 'Espiritos', name: 'Jardim dos espíritos', tag: 'A magia mora nos pequenos encontros.', icon: 'moon', color: '#f0a9d3', groups: [
      ['Guardiões', 'moon', ['Raposa da névoa', 'Gato da sorte', 'Coruja dos sonhos', 'Dragão das flores', 'Coelho lunar', 'Tanuki viajante', 'Espírito do rio', 'Imperatriz da lua']],
      ['Santuários', 'leaf', ['Ponte vermelha', 'Lago sereno', 'Bosque sagrado', 'Templo das nuvens', 'Portal florido', 'Jardim noturno', 'Montanha encantada', 'Árvore milenar']],
      ['Encantos', 'gem', ['Pétala dourada', 'Sino de vento', 'Máscara de festival', 'Lanterna celeste', 'Talismã antigo', 'Chá das estrelas', 'Espelho mágico', 'Desejo eterno']]
    ] },
    { id: 'dragons', renderFolder: 'Dragoes', name: 'Crônicas dos dragões', tag: 'Toda lenda começa com uma jornada.', icon: 'flame', color: '#ffb36b', groups: [
      ['Lendas', 'flame', ['Escudeiro do vale', 'Arqueira do sol', 'Mago das brasas', 'Rainha dragão', 'Cavaleiro de cobre', 'Bardo da floresta', 'Guardião de gelo', 'Fênix ancestral']],
      ['Reinos', 'compass', ['Vila de pedra', 'Torre de vigia', 'Castelo dourado', 'Fortaleza celeste', 'Vale das cinzas', 'Floresta rubra', 'Montanha de fogo', 'Trono dos dragões']],
      ['Artefatos', 'gem', ['Pena de fogo', 'Escama dourada', 'Espada rúnica', 'Grimório vivo', 'Anel de âmbar', 'Escudo solar', 'Orbe das eras', 'Chama primordial']]
    ] },
    { id: 'neon', renderFolder: 'Neon', name: 'Cidade de neon', tag: 'O futuro tem novas histórias.', icon: 'chip', color: '#6bd8ff', groups: [
      ['Rebeldes', 'chip', ['Mensageiro neon', 'DJ holográfica', 'Piloto elétrico', 'Fantasma digital', 'Mecânica lunar', 'Drone parceiro', 'Samurai de cromo', 'Arquiteta do amanhã']],
      ['Distritos', 'planet', ['Beco azul', 'Mercado noturno', 'Jardim holográfico', 'Torre infinita', 'Estação zero', 'Avenida violeta', 'Ponte de luz', 'Metrópole celeste']],
      ['Tecnologias', 'gem', ['Circuito antigo', 'Fita de memória', 'Chip de luz', 'Motor de fótons', 'Visor prisma', 'Chave virtual', 'Coração sintético', 'Código da origem']]
    ] },
    { id: 'wild', renderFolder: 'Expedicao', name: 'Expedição selvagem', tag: 'A aventura chama pelo seu nome.', icon: 'leaf', color: '#b6df7c', groups: [
      ['Companheiros', 'leaf', ['Sapo explorador', 'Arara solar', 'Onça da aurora', 'Guardião da selva', 'Macaco curioso', 'Tucano viajante', 'Lobo da névoa', 'Serpente ancestral']],
      ['Descobertas', 'compass', ['Trilha verde', 'Rio dourado', 'Caverna azul', 'Cidade perdida', 'Lago de flores', 'Cachoeira lunar', 'Templo das raízes', 'Paraíso escondido']],
      ['Maravilhas', 'gem', ['Semente rara', 'Fóssil antigo', 'Cristal verde', 'Flor do tempo', 'Pedra do sol', 'Pena arco-íris', 'Ídolo esmeralda', 'Coração da floresta']]
    ] }
  ];

  function seasonKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function catalog(key) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error('Temporada inválida.');
    const [year, month] = key.split('-').map(Number);
    const index = ((year * 12 + month - (2026 * 12 + 11)) % THEMES.length + THEMES.length) % THEMES.length;
    const theme = THEMES[index];
    const cards = theme.groups.flatMap(([group, icon, names], category) => names.map((name, i) => ({
      id: `${category}-${i}`, name, category, group, icon,
      page: category * 2 + Math.floor(i / 4), number: category * 8 + i + 1,
      renderSrc: `images/cards/${theme.renderFolder}/${category * 8 + i + 1}.png`,
      rarity: ['common', 'common', 'rare', i < 4 ? 'epic' : 'legendary'][i % 4]
    })));
    const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return { key, ...theme, cards, label,
      bannerSrc: `images/seasons/${key}/banner.png`, logoSrc: `images/seasons/${key}/logo.png`,
      endsAt: new Date(year, month, 1).toISOString() };
  }

  class CollectionEngine {
    constructor({ storage, now = () => new Date(), random = Math.random } = {}) {
      this.storage = storage || root.localStorage;
      this.now = now;
      this.random = random;
    }
    profileId() { return String(root.profileManager?.getActiveProfile?.()?.id || 'guest'); }
    assertAvailable(key) {
      const current = seasonKey(this.now());
      if (current < RULES.launchSeason || key < RULES.launchSeason || key > current) throw new Error('Esta temporada ainda não está disponível. A coleção estreia em novembro de 2026.');
    }
    read(profileId = this.profileId()) {
      let state;
      try { state = JSON.parse(this.storage.getItem(`aniverse:collection:v1:${profileId}`)); } catch (_) {}
      if (!state || state.version !== 1) state = { version: 1, episodes: [], fragments: 0, albums: {}, equipped: null };
      return state;
    }
    album(state, key) {
      if (!state.albums[key]) state.albums[key] = { points: 0, opened: 0, owned: [], pasted: [], claimed: [] };
      return state.albums[key];
    }
    save(state, profileId) {
      // Persist first: a storage failure must never pretend a reward was saved.
      this.storage.setItem(`aniverse:collection:v1:${profileId}`, JSON.stringify(state));
      root.dispatchEvent?.(new root.CustomEvent('collection:updated', { detail: { profileId } }));
    }
    recordEpisode({ animeId, season, episode }, profileId = this.profileId()) {
      if (seasonKey(this.now()) < RULES.launchSeason) return false;
      if (animeId == null || !Number.isInteger(Number(season)) || Number(season) < 1 || !Number.isInteger(Number(episode)) || Number(episode) < 1) return false;
      const state = this.read(profileId);
      const episodeKey = JSON.stringify([String(animeId), Number(season), Number(episode)]);
      if (state.episodes.includes(episodeKey)) return false;
      state.episodes.push(episodeKey);
      this.album(state, seasonKey(this.now())).points += RULES.episodePoints;
      this.save(state, profileId);
      return true;
    }
    rewards(state, key) {
      const book = catalog(key), album = this.album(state, key);
      const complete = cards => cards.every(card => album.pasted.includes(card.id));
      return [
        ...Array.from({ length: 6 }, (_, page) => ({ id: `page-${page}`, kind: 'Selo de página', name: `${book.groups[Math.floor(page / 2)][0]} · ${page % 2 + 1}`, fragments: 30, ready: complete(book.cards.filter(c => c.page === page)), icon: 'compass' })),
        ...book.groups.map(([name, icon], category) => ({ id: `category-${category}`, kind: 'Título de colecionador', name: `Mestre de ${name}`, fragments: 80, ready: complete(book.cards.filter(c => c.category === category)), icon })),
        { id: 'album', kind: 'Troféu da temporada', name: `Lenda · ${book.name}`, fragments: 200, ready: complete(book.cards), icon: 'trophy' }
      ].map(reward => ({ ...reward, season: key, claimed: album.claimed.includes(reward.id) }));
    }
    unlockedAvatars(profileId = this.profileId()) {
      const state = this.read(profileId), sources = new Set(), avatars = [];
      for (const key of Object.keys(state.albums).sort().reverse()) {
        if (key < RULES.launchSeason || key > seasonKey(this.now())) continue;
        const book = catalog(key), album = state.albums[key];
        // Completion itself unlocks the characters; claiming the trophy is separate.
        if (!book.cards.every(card => album.pasted.includes(card.id))) continue;
        for (const card of book.cards) {
          if (sources.has(card.renderSrc)) continue;
          sources.add(card.renderSrc);
          avatars.push({ ...card, season: key, albumName: book.name });
        }
      }
      return avatars;
    }
    snapshot(key = seasonKey(this.now()) < RULES.launchSeason ? RULES.launchSeason : seasonKey(this.now()), profileId = this.profileId()) {
      const state = this.read(profileId), album = this.album(state, key), book = catalog(key);
      const currentKey = seasonKey(this.now());
      return { ...book, ...album, profileId, fragments: state.fragments, equipped: state.equipped,
        currentKey, comingSoon: currentKey < RULES.launchSeason, isCurrent: key === currentKey, progress: album.points % RULES.packCost,
        packs: currentKey < RULES.launchSeason ? 0 : Math.max(0, Math.floor(album.points / RULES.packCost) - album.opened),
        archive: [...new Set([currentKey < RULES.launchSeason ? RULES.launchSeason : currentKey, ...Object.keys(state.albums).filter(key => key >= RULES.launchSeason && key <= currentKey)])].sort().reverse(),
        rewards: this.rewards(state, key),
        showcase: Object.keys(state.albums).filter(key => key >= RULES.launchSeason && key <= currentKey).flatMap(season => this.rewards(state, season).filter(r => r.claimed)),
        cards: book.cards.map(card => ({ ...card, owned: album.owned.includes(card.id), pasted: album.pasted.includes(card.id) }))
      };
    }
    openPack(key = seasonKey(this.now()), profileId = this.profileId()) {
      this.assertAvailable(key);
      const state = this.read(profileId), album = this.album(state, key), book = catalog(key);
      if (Math.floor(album.points / RULES.packCost) <= album.opened) throw new Error('Complete mais episódios para ganhar um pacote.');
      const draws = Array.from({ length: RULES.packSize }, (_, slot) => {
        const roll = this.random();
        const rarity = slot === 2 ? (roll < .70 ? 'rare' : roll < .95 ? 'epic' : 'legendary')
          : (roll < .60 ? 'common' : roll < .88 ? 'rare' : roll < .98 ? 'epic' : 'legendary');
        const pool = book.cards.filter(c => c.rarity === rarity);
        const card = pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))];
        const duplicate = album.owned.includes(card.id);
        if (duplicate) state.fragments += RARITIES[rarity].dust;
        else album.owned.push(card.id);
        return { ...card, duplicate, fragments: duplicate ? RARITIES[rarity].dust : 0 };
      });
      album.opened += 1;
      this.save(state, profileId);
      return draws;
    }
    pasteCard(key, id, profileId = this.profileId()) {
      this.assertAvailable(key);
      const state = this.read(profileId), album = this.album(state, key);
      if (!album.owned.includes(id) || album.pasted.includes(id)) return false;
      album.pasted.push(id);
      this.save(state, profileId);
      return true;
    }
    craftCard(key, id, profileId = this.profileId()) {
      this.assertAvailable(key);
      const state = this.read(profileId), album = this.album(state, key);
      const card = catalog(key).cards.find(c => c.id === id);
      if (!card || album.owned.includes(id)) throw new Error('Essa carta já faz parte da coleção.');
      const cost = RARITIES[card.rarity].cost;
      if (state.fragments < cost) throw new Error(`Você precisa de ${cost} fragmentos para criar esta carta.`);
      state.fragments -= cost;
      album.owned.push(id);
      this.save(state, profileId);
    }
    claimReward(key, id, profileId = this.profileId()) {
      this.assertAvailable(key);
      const state = this.read(profileId), album = this.album(state, key);
      const reward = this.rewards(state, key).find(r => r.id === id);
      if (!reward?.ready || reward.claimed) throw new Error('Esse prêmio ainda não está disponível.');
      album.claimed.push(id);
      state.fragments += reward.fragments;
      this.save(state, profileId);
      return reward;
    }
    equipReward(key, id, profileId = this.profileId()) {
      this.assertAvailable(key);
      const state = this.read(profileId);
      const reward = this.rewards(state, key).find(r => r.id === id && r.claimed);
      if (!reward) throw new Error('Resgate o prêmio antes de usá-lo.');
      state.equipped = { season: key, id, name: reward.name, icon: reward.icon };
      this.save(state, profileId);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { CollectionEngine, catalog, seasonKey, RULES, RARITIES };
  else {
    root.collectionEngine = new CollectionEngine();
    root.collectionRules = RULES;
    root.collectionRarities = RARITIES;
  }
})(typeof window !== 'undefined' ? window : globalThis);
