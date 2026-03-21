(function () {
  const ZOOM_KEY = 'aniverse_tv_zoom_level';
  const DEFAULT_ZOOM = 1;
  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 1.6;
  const ZOOM_STEP = 0.1;
  const TV_NAV_QUERY_PARAM = 'tvNav';
  const supportedKeyCodes = {
    channelUp: new Set([427]),
    channelDown: new Set([428]),
    back: new Set([10009, 461])
  };

  const KEY_CODES = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    ESCAPE: 27,
    BACKSPACE: 8,
    RETURN: 10009,
    TIZEN_BACK_ALT: 461,
    CHANNEL_UP: 427,
    CHANNEL_DOWN: 428
  };

  function isTypingTarget(target) {
    if (!target) return false;
    const tagName = (target.tagName || '').toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getFocusableElements() {
    const root = getActiveNavigationRoot();
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]'
    ];

    return Array.from(root.querySelectorAll(selectors.join(','))).filter(isVisible);
  }

  function getVisibleModals() {
    const visibleModalSelectors = [
      '.modal.active',
      '.modal[style*="display: flex"]',
      '.modal[style*="display:flex"]',
      '.modal[style*="display: block"]',
      '.modal[style*="display:block"]'
    ];
    return Array.from(document.querySelectorAll(visibleModalSelectors.join(','))).filter(isVisible);
  }

  function getActiveNavigationRoot() {
    const visibleModals = getVisibleModals();
    const topModal = visibleModals[visibleModals.length - 1];
    return topModal || document;
  }

  function getProfileModalFocusableInOrder() {
    const modal = document.getElementById('profile-modal');
    if (!modal || !isVisible(modal)) return null;

    const orderedSelectors = [
      '#close-profile-modal',
      '#profile-name',
      '.pronoun-pill',
      '.tab-btn',
      '#profile-password',
      '.color-option',
      '.bg-image-option',
      '.character-option',
      '.frame-option',
      '#save-profile-btn'
    ];

    const ordered = [];
    orderedSelectors.forEach((selector) => {
      modal.querySelectorAll(selector).forEach((el) => {
        if (isVisible(el)) ordered.push(el);
      });
    });

    return ordered.length ? ordered : null;
  }

  function moveFocusInList(list, direction) {
    if (!list || !list.length) return false;
    const active = document.activeElement;
    const currentIndex = Math.max(0, list.indexOf(active));
    const delta = direction === 'up' || direction === 'left' ? -1 : 1;
    const nextIndex = (currentIndex + delta + list.length) % list.length;
    const next = list[nextIndex];
    if (!next) return false;
    next.focus();
    next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function getSidebarFocusableInOrder() {
    const sidebar = document.querySelector('header .container');
    if (!sidebar) return null;

    const orderedSelectors = [
      '.logo-container a, .logo-container button',
      'nav a[data-section="home"]',
      'nav a[data-section="animes"]',
      'nav a[data-section="movies"]',
      'nav a[data-section="ovas"]',
      'nav a[data-section="collections"]',
      'nav a[data-section="openings"]',
      'nav a[data-section="continue"]',
      'nav a[data-section="downloads"]',
      '#dark-mode-toggle',
      '#open-anime-editor-btn',
      '#login-btn'
    ];

    const ordered = [];
    orderedSelectors.forEach((selector) => {
      sidebar.querySelectorAll(selector).forEach((el) => {
        if (isVisible(el)) ordered.push(el);
      });
    });

    return ordered.length ? ordered : null;
  }

  function isInSidebar(element) {
    const sidebar = document.querySelector('header .container');
    return Boolean(sidebar && element && sidebar.contains(element));
  }

  function focusFirstContentItem() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return false;
    const candidate = activeSection.querySelector('.anime-card, .collection-card, .news-card, .btn, [tabindex]');
    if (!candidate || !isVisible(candidate)) return false;
    candidate.focus();
    candidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function focusActiveNavItem() {
    const activeNav = document.querySelector('nav a.active, nav a[data-section="home"]');
    if (!activeNav || !isVisible(activeNav)) return false;
    activeNav.focus();
    activeNav.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function markTvFocusable(scope = document) {
    const targetSelector = [
      '.anime-card',
      '.continue-card',
      '.collection-card',
      '.character-option',
      '.frame-option',
      '.color-option',
      '.bg-image-option',
      '.tab-btn',
      '.pronoun-pill',
      '.news-card-header',
      '.btn',
      '.btn-icon',
      '.close-modal-btn',
      '.close-modal'
    ].join(',');

    const targets = [];
    if (scope.matches && scope.matches(targetSelector)) {
      targets.push(scope);
    }
    if (scope.querySelectorAll) {
      targets.push(...scope.querySelectorAll(targetSelector));
    }

    targets.forEach((element) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
      element.classList.add('tv-focus-target');
    });
  }

  function getElementCenter(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function findNextFocusable(direction) {
    const focusable = getFocusableElements();
    if (!focusable.length) return null;

    const active = document.activeElement;
    if (!active || !focusable.includes(active)) return focusable[0];

    const current = getElementCenter(active);
    let bestCandidate = null;
    let bestScore = Number.POSITIVE_INFINITY;

    focusable.forEach((candidate) => {
      if (candidate === active) return;
      const center = getElementCenter(candidate);
      const dx = center.x - current.x;
      const dy = center.y - current.y;

      const isValid =
        (direction === 'left' && dx < -4) ||
        (direction === 'right' && dx > 4) ||
        (direction === 'up' && dy < -4) ||
        (direction === 'down' && dy > 4);

      if (!isValid) return;

      const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      const score = primary * 100 + secondary;

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    return bestCandidate;
  }

  function focusInDirection(direction) {
    const nextElement = findNextFocusable(direction);
    if (nextElement && typeof nextElement.focus === 'function') {
      nextElement.focus({ preventScroll: false });
      nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      return true;
    }
    return false;
  }

  function normalizeZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_ZOOM;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(numeric.toFixed(2))));
  }

  function applyZoom(level) {
    const normalized = normalizeZoom(level);
    document.documentElement.style.setProperty('--tv-zoom-level', normalized.toString());
    document.body.style.zoom = normalized;
    localStorage.setItem(ZOOM_KEY, normalized.toString());
    return normalized;
  }

  function changeZoom(delta) {
    const current = normalizeZoom(localStorage.getItem(ZOOM_KEY) || DEFAULT_ZOOM);
    const updated = applyZoom(current + delta);
    console.info(`[AniVerse TV] Zoom ajustado para ${Math.round(updated * 100)}%`);
  }

  function closeTopModal() {
    const visibleModals = getVisibleModals();
    const modal = visibleModals[visibleModals.length - 1];
    if (!modal) return false;

    const closeButton = modal.querySelector('.close-modal, .close-modal-btn, .close-profile, [data-close-modal]');
    if (closeButton) {
      closeButton.click();
      return true;
    }

    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    return true;
  }

  function registerTizenKeys() {
    if (!window.tizen || !window.tizen.tvinputdevice) return;

    const keysToRegister = [
      'MediaPlayPause',
      'MediaPlay',
      'MediaPause',
      'MediaStop',
      'MediaRewind',
      'MediaFastForward',
      'ColorF0Red',
      'ColorF1Green',
      'ColorF2Yellow',
      'ColorF3Blue',
      'ChannelUp',
      'ChannelDown'
    ];

    keysToRegister.forEach((key) => {
      try {
        window.tizen.tvinputdevice.registerKey(key);
      } catch (_) {
        // Ignora se a tecla não existir no device atual.
      }
    });

    try {
      const supportedKeys = window.tizen.tvinputdevice.getSupportedKeys() || [];
      supportedKeys.forEach((keyInfo) => {
        const name = (keyInfo.name || '').toLowerCase();
        const code = Number(keyInfo.code);
        if (!Number.isFinite(code)) return;

        if (name.includes('channelup')) supportedKeyCodes.channelUp.add(code);
        if (name.includes('channeldown')) supportedKeyCodes.channelDown.add(code);
        if (name.includes('back') || name.includes('return')) supportedKeyCodes.back.add(code);
      });
    } catch (_) {
      // Alguns devices não expõem lista completa.
    }
  }

  function isReturnEvent(event) {
    const key = (event.key || '').toLowerCase();
    const code = (event.code || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.RETURN ||
      event.keyCode === KEY_CODES.ESCAPE ||
      event.keyCode === KEY_CODES.BACKSPACE ||
      event.keyCode === KEY_CODES.TIZEN_BACK_ALT ||
      supportedKeyCodes.back.has(event.keyCode) ||
      key === 'back' ||
      key === 'goback' ||
      key === 'xf86back' ||
      key === 'escape' ||
      key === 'esc' ||
      code === 'escape' ||
      code === 'browserback'
    );
  }

  function getArrowDirection(event) {
    const key = (event.key || '').toLowerCase();
    if (event.keyCode === KEY_CODES.LEFT || key === 'arrowleft' || key === 'left') return 'left';
    if (event.keyCode === KEY_CODES.RIGHT || key === 'arrowright' || key === 'right') return 'right';
    if (event.keyCode === KEY_CODES.UP || key === 'arrowup' || key === 'up') return 'up';
    if (event.keyCode === KEY_CODES.DOWN || key === 'arrowdown' || key === 'down') return 'down';
    return null;
  }

  function isChannelUpEvent(event) {
    const key = (event.key || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.CHANNEL_UP ||
      supportedKeyCodes.channelUp.has(event.keyCode) ||
      key === 'channelup' ||
      key === 'chup' ||
      key === 'pageup'
    );
  }

  function isChannelDownEvent(event) {
    const key = (event.key || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.CHANNEL_DOWN ||
      supportedKeyCodes.channelDown.has(event.keyCode) ||
      key === 'channeldown' ||
      key === 'chdown' ||
      key === 'pagedown'
    );
  }

  function onKeyDown(event) {
    const typingTarget = isTypingTarget(event.target);
    const normalizedKey = (event.key || '').toLowerCase();
    const arrowDirection = getArrowDirection(event);

    if (isReturnEvent(event)) {
      if (!closeTopModal() && window.history.length > 1) {
        window.history.back();
      }
      event.preventDefault();
      return;
    }

    if (isChannelUpEvent(event)) {
      changeZoom(ZOOM_STEP);
      event.preventDefault();
      return;
    }

    if (isChannelDownEvent(event)) {
      changeZoom(-ZOOM_STEP);
      event.preventDefault();
      return;
    }

    if (typingTarget && arrowDirection) {
      event.preventDefault();
      if (typeof event.target.blur === 'function') {
        event.target.blur();
      }
      const profileOrderedTargets = getProfileModalFocusableInOrder();
      if (!moveFocusInList(profileOrderedTargets, arrowDirection)) {
        focusInDirection(arrowDirection);
      }
      return;
    }

    if (typingTarget && normalizedKey === 'enter') {
      event.preventDefault();
      if (typeof event.target.blur === 'function') {
        event.target.blur();
      }
      focusInDirection('down');
      return;
    }

    if (typingTarget) return;

    if (arrowDirection) {
      event.preventDefault();

      const sidebarOrderedTargets = getSidebarFocusableInOrder();
      const active = document.activeElement;
      if (active && isInSidebar(active) && (arrowDirection === 'up' || arrowDirection === 'down')) {
        if (moveFocusInList(sidebarOrderedTargets, arrowDirection)) return;
      }
      if (active && isInSidebar(active) && arrowDirection === 'right') {
        if (focusFirstContentItem()) return;
      }
      if (active && !isInSidebar(active) && arrowDirection === 'left') {
        if (focusActiveNavItem()) return;
      }

      const profileOrderedTargets = getProfileModalFocusableInOrder();
      if (!moveFocusInList(profileOrderedTargets, arrowDirection)) {
        focusInDirection(arrowDirection);
      }
      return;
    }

    switch (event.keyCode) {
      case KEY_CODES.ENTER: {
        const active = document.activeElement;
        if (active && !isTypingTarget(active) && typeof active.click === 'function') {
          active.click();
          event.preventDefault();
        }
        break;
      }
      default:
        if (normalizedKey === 'enter') {
          const active = document.activeElement;
          if (active && !isTypingTarget(active) && typeof active.click === 'function') {
            active.click();
            event.preventDefault();
          }
        }
        break;
    }
  }

  function isTvNavigationRuntime() {
    const userAgent = navigator.userAgent || '';
    const hasTvUserAgent = /(tizen|smart-tv|smarttv|hbbtv|web0s|netcast|googletv|appletv|tv)/i.test(userAgent);
    const hasTizen = Boolean(window.tizen && window.tizen.tvinputdevice);
    const searchParams = new URLSearchParams(window.location.search);
    const forceTvNav = searchParams.get(TV_NAV_QUERY_PARAM) === '1';
    const persistedTvMode = localStorage.getItem('aniverse_tv_mode') === '1';

    if (forceTvNav) {
      localStorage.setItem('aniverse_tv_mode', '1');
    }

    return hasTizen || forceTvNav || hasTvUserAgent || persistedTvMode;
  }

  function forceDarkThemeForTvMode() {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    localStorage.setItem('aniverse_theme', 'theme-dark');
  }

  function initTvMutationObserver() {
    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (scheduled) return;
      const hasElementMutation = mutations.some((mutation) => mutation.addedNodes.length > 0);
      if (!hasElementMutation) return;

      scheduled = true;
      window.requestAnimationFrame(() => {
        markTvFocusable(document);
        scheduled = false;
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initTvRemoteSupport() {
    if (!isTvNavigationRuntime()) return;

    localStorage.setItem('aniverse_tv_mode', '1');
    document.body.classList.add('tv-mode');
    forceDarkThemeForTvMode();
    registerTizenKeys();
    applyZoom(localStorage.getItem(ZOOM_KEY) || DEFAULT_ZOOM);
    markTvFocusable(document);
    initTvMutationObserver();
    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('tizenhwkey', (event) => {
      const keyName = (event.keyName || '').toLowerCase();
      if (keyName === 'back') {
        if (!closeTopModal() && window.history.length > 1) {
          window.history.back();
        }
        event.preventDefault?.();
      }
    });

    if (!document.activeElement || document.activeElement === document.body) {
      const firstNavItem = document.querySelector('nav a[data-section]');
      if (firstNavItem) {
        firstNavItem.focus();
      } else {
        const firstFocusable = getFocusableElements()[0];
        if (firstFocusable) firstFocusable.focus();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTvRemoteSupport, { once: true });
  } else {
    initTvRemoteSupport();
  }
})();
