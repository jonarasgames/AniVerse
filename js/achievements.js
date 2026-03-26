(function () {
  'use strict';

  const DATA_URL = 'achievements-data.json';
  const VALID_TYPES = new Set([
    'episodes_completed_total',
    'episodes_watched',
    'anime_started_total',
    'daily_streak',
    'days_open_total',
    'continue_entries',
    'sections_visited_total',
    'profile_count',
    'achievements_unlocked_total',
    'ratings_given'
  ]);

  const STATE_KEY_PREFIX = 'aniVerseAchievementsState';

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function parseJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    return parseJson(localStorage.getItem(key), fallback);
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getProfileId() {
    const active = window.profileManager?.getActiveProfile?.();
    return active?.id ? String(active.id) : 'guest';
  }

  function getStateKey(profileId) {
    return `${STATE_KEY_PREFIX}:${profileId}`;
  }

  function normalizeSet(input) {
    return Array.isArray(input) ? Array.from(new Set(input.map(String))) : [];
  }

  function validateConfig(data) {
    if (!data || typeof data !== 'object') return { ok: false, error: 'JSON inválido' };
    if (!Number.isInteger(data.version)) return { ok: false, error: 'version inválido' };
    if (typeof data.soundEnabledByDefault !== 'boolean') return { ok: false, error: 'soundEnabledByDefault inválido' };
    if (!Array.isArray(data.items)) return { ok: false, error: 'items inválido' };

    const required = ['id', 'name', 'desc', 'icon', 'sound', 'type', 'goal'];
    for (const item of data.items) {
      if (!item || typeof item !== 'object') return { ok: false, error: 'item inválido' };
      const keys = Object.keys(item).sort();
      if (keys.length !== required.length || required.some((field) => !keys.includes(field))) {
        return { ok: false, error: `schema fixo inválido para ${item.id || '(sem id)'}` };
      }
      if (!item.id || !item.name || !item.desc || !item.icon) return { ok: false, error: `campos vazios em ${item.id}` };
      if (!VALID_TYPES.has(item.type)) return { ok: false, error: `type inválido em ${item.id}` };
      if (!Number.isFinite(Number(item.goal)) || Number(item.goal) <= 0) return { ok: false, error: `goal inválido em ${item.id}` };
    }

    return { ok: true };
  }

  class AchievementEngine {
    constructor() {
      this.config = null;
      this.loaded = false;
      this.loadPromise = null;
    }

    async loadData() {
      if (this.loaded) return this.config;
      if (this.loadPromise) return this.loadPromise;

      this.loadPromise = fetch(DATA_URL, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error('Falha ao carregar achievements-data.json');
          return res.json();
        })
        .then((json) => {
          const validation = validateConfig(json);
          if (!validation.ok) throw new Error(validation.error);
          this.config = json;
          this.loaded = true;
          return json;
        })
        .catch((error) => {
          console.warn('Achievements indisponível:', error?.message || error);
          return null;
        });

      return this.loadPromise;
    }

    ensureState(profileId) {
      const key = getStateKey(profileId);
      const existing = readStorage(key, null);
      const state = existing && typeof existing === 'object' ? existing : {};

      state.version = this.config?.version || 1;
      state.unlocked = state.unlocked && typeof state.unlocked === 'object' ? state.unlocked : {};
      state.seen = state.seen && typeof state.seen === 'object' ? state.seen : {};
      state.progress = state.progress && typeof state.progress === 'object' ? state.progress : {};
      state.pendingQueue = Array.isArray(state.pendingQueue) ? state.pendingQueue : [];
      state.soundEnabled = typeof state.soundEnabled === 'boolean' ? state.soundEnabled : (this.config?.soundEnabledByDefault !== false);
      state.daily = state.daily && typeof state.daily === 'object' ? state.daily : { lastOpenDay: null, current: 0, best: 0 };
      state.stats = state.stats && typeof state.stats === 'object' ? state.stats : {};
      state.stats.episodesCompleted = normalizeSet(state.stats.episodesCompleted);
      state.stats.animeStarted = normalizeSet(state.stats.animeStarted);
      state.stats.sectionsVisited = normalizeSet(state.stats.sectionsVisited);
      state.stats.daysOpened = normalizeSet(state.stats.daysOpened);

      return state;
    }

    processEvent(state, options = {}) {
      const type = options.eventType;
      const tKey = todayKey();

      if (type === 'app_open') {
        if (!state.stats.daysOpened.includes(tKey)) state.stats.daysOpened.push(tKey);

        if (state.daily.lastOpenDay !== tKey) {
          if (state.daily.lastOpenDay) {
            const prev = new Date(`${state.daily.lastOpenDay}T00:00:00`);
            const curr = new Date(`${tKey}T00:00:00`);
            const diff = Math.round((curr - prev) / 86400000);
            state.daily.current = diff === 1 ? Number(state.daily.current || 0) + 1 : 1;
          } else {
            state.daily.current = 1;
          }
          state.daily.lastOpenDay = tKey;
          state.daily.best = Math.max(Number(state.daily.best || 0), Number(state.daily.current || 0));
        }
      }

      if (type === 'episode_complete') {
        const animeId = options.animeId ?? window.currentWatchingAnime?.id;
        const season = options.season ?? window.currentWatchingAnime?.season;
        const episode = options.episode ?? window.currentWatchingAnime?.episode;
        if (animeId != null && season != null && episode != null) {
          const key = `${animeId}-${season}-${episode}`;
          if (!state.stats.episodesCompleted.includes(key)) state.stats.episodesCompleted.push(key);
          const animeKey = String(animeId);
          if (!state.stats.animeStarted.includes(animeKey)) state.stats.animeStarted.push(animeKey);
        }
      }

      if (type === 'section_visit' && options.sectionId) {
        const sectionId = String(options.sectionId);
        if (!state.stats.sectionsVisited.includes(sectionId)) state.stats.sectionsVisited.push(sectionId);
      }

      if (type === 'continue_update') {
        // métrica lida dinamicamente do profileManager
      }
    }

    buildMetrics(profileId, state) {
      const watchedLegacy = Object.keys(readStorage('watchedEpisodes', {})).length;
      const ratings = Object.keys(readStorage('userEpisodeRatings', {})).length;
      const activeProfile = window.profileManager?.getProfile?.(profileId);
      const continueEntries = Array.isArray(activeProfile?.continueWatching) ? activeProfile.continueWatching.length : 0;
      const profiles = window.profileManager?.getAllProfiles?.() || [];
      const unlockedCount = Object.keys(state.unlocked || {}).length;

      return {
        episodes_completed_total: Math.max(state.stats.episodesCompleted.length, watchedLegacy),
        episodes_watched: Math.max(state.stats.episodesCompleted.length, watchedLegacy),
        anime_started_total: state.stats.animeStarted.length,
        daily_streak: Number(state.daily.current || 0),
        days_open_total: state.stats.daysOpened.length,
        continue_entries: continueEntries,
        sections_visited_total: state.stats.sectionsVisited.length,
        profile_count: profiles.length,
        achievements_unlocked_total: unlockedCount,
        ratings_given: ratings
      };
    }

    async refresh(options = {}) {
      await this.loadData();
      if (!this.config) return null;

      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      this.processEvent(state, options);

      const metrics = this.buildMetrics(profileId, state);
      const justUnlocked = [];

      this.config.items.forEach((item) => {
        const metric = Number(metrics[item.type] || 0);
        const goal = Number(item.goal || 1);
        state.progress[item.id] = Math.max(0, Math.min(goal, metric));

        if (metric >= goal && !state.unlocked[item.id]) {
          state.unlocked[item.id] = new Date().toISOString();
          state.seen[item.id] = false;
          state.pendingQueue.push(item.id);
          justUnlocked.push(item.id);
        }
      });

      state.pendingQueue = normalizeSet(state.pendingQueue);
      writeStorage(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, justUnlocked);
      return { profileId, state, metrics, justUnlocked };
    }

    emitUpdated(profileId, state, justUnlocked) {
      window.dispatchEvent(new CustomEvent('achievements:updated', {
        detail: { profileId, state, justUnlocked }
      }));
    }

    getSnapshot() {
      if (!this.config) return null;
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      const items = this.config.items.map((item) => {
        const goal = Number(item.goal || 1);
        const progress = Number(state.progress[item.id] || 0);
        const unlockedAt = state.unlocked[item.id] || null;
        return {
          ...item,
          goal,
          progress,
          unlockedAt,
          unlocked: Boolean(unlockedAt),
          seen: state.seen[item.id] !== false,
          progressPercent: Math.round((Math.min(goal, progress) / goal) * 100)
        };
      });

      const unseenCount = items.filter((it) => it.unlocked && !it.seen).length;
      return {
        profileId,
        soundEnabled: !!state.soundEnabled,
        unseenCount,
        items,
        stats: {
          streak: Number(state.daily.current || 0),
          daysOpened: state.stats.daysOpened.length,
          episodesCompleted: state.stats.episodesCompleted.length,
          sectionsVisited: state.stats.sectionsVisited.length
        }
      };
    }

    setSoundEnabled(enabled) {
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      state.soundEnabled = !!enabled;
      writeStorage(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, []);
    }

    markAllSeen() {
      if (!this.config) return;
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      this.config.items.forEach((item) => {
        if (state.unlocked[item.id]) state.seen[item.id] = true;
      });
      state.pendingQueue = [];
      writeStorage(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, []);
    }

    drainPendingUnlocks() {
      if (!this.config) return [];
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      const pending = normalizeSet(state.pendingQueue);
      state.pendingQueue = [];
      writeStorage(getStateKey(profileId), state);
      return pending.map((id) => this.config.items.find((item) => item.id === id)).filter(Boolean);
    }
  }

  window.achievementEngine = new AchievementEngine();
})();
