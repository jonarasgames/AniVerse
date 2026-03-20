(function () {
  const ZOOM_KEY = 'aniverse_tv_zoom_level';
  const DEFAULT_ZOOM = 1;
  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 1.6;
  const ZOOM_STEP = 0.1;

  const KEY_CODES = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    RETURN: 10009,
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
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]'
    ];

    return Array.from(document.querySelectorAll(selectors.join(','))).filter(isVisible);
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
    const visibleModalSelectors = [
      '.modal.active',
      '.modal[style*="display: flex"]',
      '.modal[style*="display:flex"]',
      '.modal[style*="display: block"]',
      '.modal[style*="display:block"]'
    ];
    const visibleModals = Array.from(document.querySelectorAll(visibleModalSelectors.join(','))).filter(isVisible);
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
  }

  function isReturnEvent(event) {
    const key = (event.key || '').toLowerCase();
    const code = (event.code || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.RETURN ||
      key === 'back' ||
      key === 'goback' ||
      key === 'xf86back' ||
      code === 'browserback'
    );
  }

  function isChannelUpEvent(event) {
    const key = (event.key || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.CHANNEL_UP ||
      key === 'channelup' ||
      key === 'chup' ||
      key === 'pageup'
    );
  }

  function isChannelDownEvent(event) {
    const key = (event.key || '').toLowerCase();
    return (
      event.keyCode === KEY_CODES.CHANNEL_DOWN ||
      key === 'channeldown' ||
      key === 'chdown' ||
      key === 'pagedown'
    );
  }

  function onKeyDown(event) {
    const typingTarget = isTypingTarget(event.target);

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

    if (typingTarget) return;

    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        if (focusInDirection('left')) event.preventDefault();
        break;
      case KEY_CODES.RIGHT:
        if (focusInDirection('right')) event.preventDefault();
        break;
      case KEY_CODES.UP:
        if (focusInDirection('up')) event.preventDefault();
        break;
      case KEY_CODES.DOWN:
        if (focusInDirection('down')) event.preventDefault();
        break;
      case KEY_CODES.ENTER: {
        const active = document.activeElement;
        if (active && !isTypingTarget(active) && typeof active.click === 'function') {
          active.click();
          event.preventDefault();
        }
        break;
      }
      default:
        break;
    }
  }

  function initTvRemoteSupport() {
    registerTizenKeys();
    applyZoom(localStorage.getItem(ZOOM_KEY) || DEFAULT_ZOOM);
    document.addEventListener('keydown', onKeyDown, { capture: true });

    if (!document.activeElement || document.activeElement === document.body) {
      const firstFocusable = getFocusableElements()[0];
      if (firstFocusable) firstFocusable.focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTvRemoteSupport, { once: true });
  } else {
    initTvRemoteSupport();
  }
})();
