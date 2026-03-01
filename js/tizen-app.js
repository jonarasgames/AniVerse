(function () {
  'use strict';

  function isTizenRuntime() {
    return typeof window.tizen !== 'undefined' || /Tizen/i.test(navigator.userAgent || '');
  }

  function registerKeys() {
    if (!window.tizen || !window.tizen.tvinputdevice) return;
    const keys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
      'MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop',
      'MediaFastForward', 'MediaRewind', 'Exit'
    ];

    keys.forEach((k) => {
      try { window.tizen.tvinputdevice.registerKey(k); } catch (e) {}
    });
  }

  function ensureInitialFocus() {
    const candidates = document.querySelectorAll('nav a[data-section], .anime-card, .music-card, .btn, button');
    const first = Array.from(candidates).find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (first) first.focus();
  }

  function setupBackHandler() {
    window.addEventListener('tizenhwkey', (e) => {
      if (!e || e.keyName !== 'back') return;
      const opened = document.querySelector('.modal[style*="display: block"], .modal.active, .modal.show');
      if (opened) {
        const close = opened.querySelector('.close-modal, .close-modal-btn');
        if (close) close.click();
        else opened.style.display = 'none';
      }
    });
  }

  function init() {
    if (!isTizenRuntime()) return;
    document.body.classList.add('tizen-app', 'tv-mode');
    registerKeys();
    setupBackHandler();
    ensureInitialFocus();
    console.info('[AniVerse] Tizen runtime mode enabled');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
