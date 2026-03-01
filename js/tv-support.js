(function () {
  const TV_MODE_KEY = 'aniVerseTvMode';
  const focusableSelector = [
    'nav a[data-section]',
    '.anime-card',
    '.music-card',
    '.btn',
    '.btn-icon',
    'button',
    'select',
    'input:not([type="hidden"])',
    'textarea',
    '.close-modal',
    '.close-modal-btn',
    '.footer-link'
  ].join(',');

  function isSamsungTvLike() {
    return /SMART-TV|Tizen|SamsungBrowser|TV/i.test(navigator.userAgent || '');
  }

  function shouldEnableTvMode() {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tv');
    if (forced === '1') return true;
    if (forced === '0') return false;

    const saved = localStorage.getItem(TV_MODE_KEY);
    if (saved === 'enabled') return true;
    if (saved === 'disabled') return false;

    return isSamsungTvLike();
  }

  function registerTizenKeys() {
    if (!window.tizen || !window.tizen.tvinputdevice) return;
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'ColorF0Red', 'Exit'];
    keys.forEach((key) => {
      try {
        window.tizen.tvinputdevice.registerKey(key);
      } catch (error) {
        // ignore unsupported key
      }
    });
  }

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getFocusableElements() {
    return Array.from(document.querySelectorAll(focusableSelector)).filter(isVisible);
  }

  function prepareCardsForFocus() {
    document.querySelectorAll('.anime-card, .music-card').forEach((card) => {
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
    });
  }

  function distanceInDirection(fromRect, toRect, direction) {
    const fromX = fromRect.left + fromRect.width / 2;
    const fromY = fromRect.top + fromRect.height / 2;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;

    if (direction === 'left' && toX >= fromX) return Infinity;
    if (direction === 'right' && toX <= fromX) return Infinity;
    if (direction === 'up' && toY >= fromY) return Infinity;
    if (direction === 'down' && toY <= fromY) return Infinity;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const primary = (direction === 'left' || direction === 'right') ? Math.abs(dx) : Math.abs(dy);
    const secondary = (direction === 'left' || direction === 'right') ? Math.abs(dy) : Math.abs(dx);

    return primary * 1.2 + secondary;
  }

  function moveFocus(direction) {
    const focusables = getFocusableElements();
    if (!focusables.length) return;

    const active = document.activeElement;
    if (!active || !focusables.includes(active)) {
      focusables[0].focus();
      return;
    }

    const fromRect = active.getBoundingClientRect();
    let bestCandidate = null;
    let bestDistance = Infinity;

    focusables.forEach((el) => {
      if (el === active) return;
      const candidateRect = el.getBoundingClientRect();
      const score = distanceInDirection(fromRect, candidateRect, direction);
      if (score < bestDistance) {
        bestDistance = score;
        bestCandidate = el;
      }
    });

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  function closeOpenModal() {
    const opened = document.querySelector('.modal[style*="display: block"], .modal.active, .modal.show');
    if (!opened) return false;
    const closeButton = opened.querySelector('.close-modal, .close-modal-btn, [aria-label="Close"]');
    if (closeButton) {
      closeButton.click();
      return true;
    }
    opened.style.display = 'none';
    return true;
  }

  function handleTvKeydown(event) {
    const tagName = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    const editingText = tagName === 'input' || tagName === 'textarea';

    if (event.key === 'Escape' || event.keyCode === 10009) {
      if (closeOpenModal()) {
        event.preventDefault();
      }
      return;
    }

    if (editingText) return;

    if (event.key === 'ArrowLeft' || event.keyCode === 37) {
      event.preventDefault();
      moveFocus('left');
    } else if (event.key === 'ArrowRight' || event.keyCode === 39) {
      event.preventDefault();
      moveFocus('right');
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      event.preventDefault();
      moveFocus('up');
    } else if (event.key === 'ArrowDown' || event.keyCode === 40) {
      event.preventDefault();
      moveFocus('down');
    } else if (event.key === 'Enter' || event.keyCode === 13) {
      const active = document.activeElement;
      if (active && typeof active.click === 'function') {
        event.preventDefault();
        active.click();
      }
    }
  }

  function initTvMode() {
    if (!shouldEnableTvMode()) return;

    document.body.classList.add('tv-mode');
    registerTizenKeys();
    prepareCardsForFocus();

    const observer = new MutationObserver(() => {
      prepareCardsForFocus();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', handleTvKeydown);

    const firstFocusable = getFocusableElements()[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }

    console.info('[AniVerse] TV mode enabled');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTvMode);
  } else {
    initTvMode();
  }
})();
