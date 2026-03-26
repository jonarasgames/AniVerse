(function () {
  'use strict';

  const DATA_URL = 'achievements-data.json';
  const STATE_KEY_PREFIX = 'aniVerseAchievementsState';
  const APP_OPEN_KEY_PREFIX = 'aniVerseAchievementsAppOpen';
  const VALID_TYPES = new Set(['episodes_watched', 'ratings_given', 'daily_streak', 'continue_entries']);

  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getProfileId() {
    try {
      const profile = window.profileManager?.getActiveProfile?.();
      return profile?.id ? String(profile.id) : 'guest';
    } catch (_) {
      return 'guest';
    }
  }

  function getStateKey(profileId) {
    return `${STATE_KEY_PREFIX}:${profileId}`;
  }

  function getAppOpenKey(profileId) {
    return `${APP_OPEN_KEY_PREFIX}:${profileId}`;
  }

  function readJsonSafe(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function saveJsonSafe(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function validateDataShape(data) {
    if (!data || typeof data !== 'object') return { valid: false, message: 'JSON inválido.' };
    if (!Number.isInteger(data.version)) return { valid: false, message: 'version ausente/inválida.' };
    if (typeof data.soundEnabledByDefault !== 'boolean') return { valid: false, message: 'soundEnabledByDefault inválido.' };
    if (!Array.isArray(data.items)) return { valid: false, message: 'items deve ser array.' };

    const required = ['id', 'name', 'desc', 'icon', 'sound', 'type', 'goal'];
    for (const item of data.items) {
      if (!item || typeof item !== 'object') return { valid: false, message: 'item inválido.' };
      const keys = Object.keys(item);
      if (keys.length !== required.length || !required.every((k) => keys.includes(k))) {
        return { valid: false, message: `item ${item.id || '(sem id)'} com schema inválido.` };
      }
      if (!item.id || !item.name || !item.desc) return { valid: false, message: `item ${item.id || '(sem id)'} sem texto obrigatório.` };
      if (!VALID_TYPES.has(item.type)) return { valid: false, message: `item ${item.id} com type inválido.` };
      if (!Number.isFinite(Number(item.goal)) || Number(item.goal) <= 0) {
        return { valid: false, message: `item ${item.id} com goal inválido.` };
      }
      if (/^https?:\/\//i.test(String(item.icon)) || /^https?:\/\//i.test(String(item.sound))) {
        return { valid: false, message: `item ${item.id} usa URL externa.` };
      }
    }

    return { valid: true };
  }

  function computeMetrics(profileId, state) {
    const watchedEpisodes = readJsonSafe('watchedEpisodes', {});
    const userRatings = readJsonSafe('userEpisodeRatings', {});
    let continueEntries = 0;

    try {
      const profile = window.profileManager?.getProfile?.(profileId);
      continueEntries = Array.isArray(profile?.continueWatching) ? profile.continueWatching.length : 0;
    } catch (_) {
      continueEntries = 0;
    }

    return {
      episodes_watched: Object.keys(watchedEpisodes || {}).length,
      ratings_given: Object.keys(userRatings || {}).length,
      daily_streak: Number(state?.daily?.current || 0),
      continue_entries: Number(continueEntries || 0)
    };
  }

  class AchievementEngine {
    constructor() {
      this.data = null;
      this.loaded = false;
      this.loadPromise = null;
    }

    async loadData() {
      if (this.loaded) return this.data;
      if (this.loadPromise) return this.loadPromise;

      this.loadPromise = fetch(DATA_URL, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error('Falha ao carregar achievements-data.json');
          return res.json();
        })
        .then((data) => {
          const validation = validateDataShape(data);
          if (!validation.valid) throw new Error(validation.message);
          this.data = data;
          this.loaded = true;
          return data;
        })
        .catch((error) => {
          console.warn('Achievements desabilitados:', error?.message || error);
          this.data = null;
          return null;
        });

      return this.loadPromise;
    }

    ensureState(profileId) {
      const key = getStateKey(profileId);
      const existing = readJsonSafe(key, null);
      const defaultSound = this.data?.soundEnabledByDefault !== false;
      const state = existing && typeof existing === 'object'
        ? existing
        : {
            version: this.data?.version || 1,
            unlocked: {},
            seen: {},
            progress: {},
            pendingQueue: [],
            soundEnabled: defaultSound,
            daily: {
              lastOpenDay: null,
              current: 0,
              best: 0
            }
          };

      if (!state.daily || typeof state.daily !== 'object') {
        state.daily = { lastOpenDay: null, current: 0, best: 0 };
      }
      if (!Array.isArray(state.pendingQueue)) state.pendingQueue = [];
      if (typeof state.soundEnabled !== 'boolean') state.soundEnabled = defaultSound;
      if (!state.unlocked || typeof state.unlocked !== 'object') state.unlocked = {};
      if (!state.seen || typeof state.seen !== 'object') state.seen = {};
      if (!state.progress || typeof state.progress !== 'object') state.progress = {};

      return state;
    }

    updateDailyOpen(profileId, state) {
      const today = getTodayKey();
      const appOpenKey = getAppOpenKey(profileId);
      const appOpenMeta = readJsonSafe(appOpenKey, { lastOpenDay: null });

      if (appOpenMeta.lastOpenDay === today) return;

      const last = state.daily.lastOpenDay;
      const lastDate = last ? new Date(`${last}T00:00:00`) : null;
      const todayDate = new Date(`${today}T00:00:00`);
      const diffDays = lastDate ? Math.round((todayDate - lastDate) / (24 * 60 * 60 * 1000)) : null;

      if (diffDays === 1) {
        state.daily.current = Number(state.daily.current || 0) + 1;
      } else if (diffDays === 0) {
        // no-op
      } else {
        state.daily.current = 1;
      }

      state.daily.lastOpenDay = today;
      state.daily.best = Math.max(Number(state.daily.best || 0), Number(state.daily.current || 0));

      saveJsonSafe(appOpenKey, { lastOpenDay: today });
    }

    async refresh(options = {}) {
      await this.loadData();
      if (!this.data) return null;

      const profileId = getProfileId();
      const state = this.ensureState(profileId);

      if (options.eventType === 'app_open') {
        this.updateDailyOpen(profileId, state);
      }

      const metrics = computeMetrics(profileId, state);
      const justUnlocked = [];

      this.data.items.forEach((item) => {
        const value = Number(metrics[item.type] || 0);
        const goal = Number(item.goal || 1);
        const bounded = Math.max(0, Math.min(goal, value));
        state.progress[item.id] = bounded;

        if (bounded >= goal && !state.unlocked[item.id]) {
          const nowIso = new Date().toISOString();
          state.unlocked[item.id] = nowIso;
          state.seen[item.id] = false;
          state.pendingQueue.push(item.id);
          justUnlocked.push(item.id);
        }
      });

      saveJsonSafe(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, justUnlocked);
      return { profileId, state, metrics, justUnlocked };
    }

    emitUpdated(profileId, state, justUnlocked = []) {
      window.dispatchEvent(new CustomEvent('achievements:updated', {
        detail: {
          profileId,
          justUnlocked,
          state
        }
      }));
    }

    getSnapshot() {
      if (!this.data) return null;
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      const items = this.data.items.map((item) => {
        const goal = Number(item.goal || 1);
        const progress = Number(state.progress[item.id] || 0);
        const unlockedAt = state.unlocked[item.id] || null;
        return {
          ...item,
          goal,
          progress,
          unlockedAt,
          unlocked: Boolean(unlockedAt),
          seen: state.seen[item.id] !== false
        };
      });

      const unseenCount = items.filter((item) => item.unlocked && item.seen === false).length;
      return {
        profileId,
        soundEnabled: !!state.soundEnabled,
        unseenCount,
        items
      };
    }

    setSoundEnabled(enabled) {
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      state.soundEnabled = !!enabled;
      saveJsonSafe(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, []);
    }

    markAllSeen() {
      if (!this.data) return;
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      this.data.items.forEach((item) => {
        if (state.unlocked[item.id]) state.seen[item.id] = true;
      });
      state.pendingQueue = [];
      saveJsonSafe(getStateKey(profileId), state);
      this.emitUpdated(profileId, state, []);
    }

    drainPendingUnlocks() {
      if (!this.data) return [];
      const profileId = getProfileId();
      const state = this.ensureState(profileId);
      const ids = Array.from(new Set(state.pendingQueue || []));
      state.pendingQueue = [];
      saveJsonSafe(getStateKey(profileId), state);
      return ids
        .map((id) => this.data.items.find((item) => item.id === id))
        .filter(Boolean);
    }
  }

  window.achievementEngine = new AchievementEngine();
})();
