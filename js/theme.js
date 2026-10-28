/* One theme owner for HTML, body, storage and the toggle button. */
(function () {
  'use strict';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'theme-dark' || value === 'theme-light';
  function readPreference() {
    try {
      const saved = localStorage.getItem('aniverse_theme');
      if (valid(saved)) return saved;
      const legacy = localStorage.getItem('darkMode');
      if (legacy === 'enabled' || legacy === 'disabled') return legacy === 'enabled' ? 'theme-dark' : 'theme-light';
    } catch (_) {}
    return null;
  }
  function applyTheme(theme, persist = false) {
    const dark = theme === 'theme-dark';
    document.documentElement.classList.toggle('theme-dark', dark);
    document.documentElement.classList.toggle('theme-light', !dark);
    document.body.classList.toggle('dark-mode', dark);
    document.body.classList.toggle('light-mode', !dark);
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
      const icon = toggle.querySelector('i');
      if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
      toggle.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.title = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
    }
    if (persist) try {
      localStorage.setItem('aniverse_theme', theme);
      localStorage.setItem('darkMode', dark ? 'enabled' : 'disabled');
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('aniverse:theme-changed', { detail: { theme } }));
    return theme;
  }
  function toggleTheme() {
    return applyTheme(document.documentElement.classList.contains('theme-dark') ? 'theme-light' : 'theme-dark', true);
  }
  function init() {
    applyTheme(readPreference() || (media.matches ? 'theme-dark' : 'theme-light'));
    document.getElementById('dark-mode-toggle')?.addEventListener('click', toggleTheme);
  }
  media.addEventListener('change', () => { if (!readPreference()) applyTheme(media.matches ? 'theme-dark' : 'theme-light'); });
  window.addEventListener('storage', event => {
    if (event.key === 'aniverse_theme' || event.key === 'darkMode') applyTheme(readPreference() || (media.matches ? 'theme-dark' : 'theme-light'));
  });
  window.toggleTheme = toggleTheme;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
