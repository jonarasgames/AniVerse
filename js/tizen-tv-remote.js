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
  let focusCache = {
    root: null,
    stamp: 0,
    items: []
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
    const stamp = Number(root.dataset.tvFocusStamp || 0);
    if (focusCache.root === root && focusCache.stamp === stamp && Array.isArray(focusCache.items) && focusCache.items.length) {
      return focusCache.items;
    }
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]'
    ];

    const items = Array.from(root.querySelectorAll(selectors.join(','))).filter(isVisible);
    focusCache = { root, stamp, items };
    return items;
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

  function getTopVisibleModal() {
    const visibleModals = getVisibleModals();
    return visibleModals[visibleModals.length - 1] || null;
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

    // Fallback: inclui qualquer controle visível que não entrou na ordem fixa
    modal.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])').forEach((el) => {
      if (!isVisible(el)) return;
      if (!ordered.includes(el)) ordered.push(el);
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
    next.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
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
    const ordered = getContentFocusableInOrder();
    const candidate = ordered && ordered[0];
    if (!candidate || !isVisible(candidate)) return false;
    candidate.focus();
    candidate.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function focusActiveNavItem() {
    const activeNav = document.querySelector('nav a.active, nav a[data-section="home"]');
    if (!activeNav || !isVisible(activeNav)) return false;
    activeNav.focus();
    activeNav.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function getContentFocusableInOrder() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return null;
    const sectionId = activeSection.id || '';

    const selectorsBySection = {
      'home-section': [
        '#continue-watching-grid .anime-card',
        '#new-releases-grid .anime-card',
        '#full-catalog-grid .anime-card',
        '.btn'
      ],
      'animes-section': ['.anime-card', '.btn'],
      'movies-section': ['.anime-card', '.btn'],
      'ovas-section': ['.anime-card', '.btn'],
      'collections-section': ['.collection-card', '.anime-card', '.btn'],
      'openings-section': ['.music-track-card', '.music-card', '.btn'],
      'continue-section': ['.anime-card', '.btn'],
      'downloads-section': ['.download-card', '.btn']
    };

    const fallbackSelectors = [
      '.anime-card',
      '.collection-card',
      '.download-card',
      '.music-card',
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const selectors = selectorsBySection[sectionId] || fallbackSelectors;

    const ordered = Array.from(activeSection.querySelectorAll(selectors.join(','))).filter((el) => {
      return isVisible(el) && !el.closest('.modal');
    });

    return ordered.length ? ordered : null;
  }

  function setSidebarExpanded(expanded) {
    document.body.classList.toggle('tv-sidebar-expanded', Boolean(expanded));
  }

  function ensureTvControlsHint() {
    if (document.getElementById('tv-controls-hint')) return;
    const hint = document.createElement('div');
    hint.id = 'tv-controls-hint';
    hint.innerHTML = `
      <div class="tv-hint-title">Controles • <span id="tv-hint-context">Menu</span></div>
      <div class="tv-hint-row">
        <span><i class="fas fa-arrows-up-down-left-right"></i> Navegar</span>
        <span><i class="fas fa-arrow-left"></i> Menu</span>
        <span><i class="fas fa-arrow-right"></i> Entrar</span>
        <span><i class="fas fa-circle-check"></i> OK</span>
        <span><i class="fas fa-reply"></i> Voltar</span>
      </div>
    `;
    document.body.appendChild(hint);
  }

  function updateTvControlsHintContext(target) {
    const context = document.getElementById('tv-hint-context');
    if (!context) return;
    if (!target) {
      context.textContent = 'Menu';
      return;
    }

    if (target.closest('#video-modal')) {
      context.textContent = 'Player';
      return;
    }
    if (target.closest('#profile-modal')) {
      context.textContent = 'Perfil';
      return;
    }
    if (target.closest('#full-catalog-grid')) {
      context.textContent = 'Catálogo';
      return;
    }
    if (isInSidebar(target)) {
      context.textContent = 'Menu';
      return;
    }
    context.textContent = 'Seção';
  }

  function syncVideoModalState() {
    const videoModal = document.getElementById('video-modal');
    const isOpen = Boolean(videoModal && isVisible(videoModal));
    document.body.classList.toggle('tv-video-active', isOpen);
  }

  function getFocusedLoopList(direction) {
    if (direction !== 'up' && direction !== 'down') return null;
    const active = document.activeElement;
    if (!active) return null;

    const listContainer = active.closest('#full-catalog-grid, #new-releases-grid, #animes-grid, #movies-grid, #ovas-grid, #openings-section .music-tracks');
    if (!listContainer) return null;

    const cards = Array.from(listContainer.querySelectorAll('.anime-card, .music-card, .music-track-card')).filter(isVisible);
    return cards.length ? cards : null;
  }

  function getGridContainerForFocus() {
    const active = document.activeElement;
    if (!active || !active.closest) return null;
    return active.closest('#full-catalog-grid, #new-releases-grid, #animes-grid, #movies-grid, #ovas-grid, #openings-section .music-tracks');
  }

  function getVideoModalTvNavigationList() {
    const modal = document.getElementById('video-modal');
    if (!modal || !isVisible(modal)) return null;
    const orderedSelectors = [
      '#play-pause-btn',
      '.timeline-container',
      '#skip-opening-btn',
      '#next-episode-btn',
      '#fullscreen-btn',
      '#season-select',
      '#episode-select',
      '#video-collections-row .video-collection-chip',
      '#close-video'
    ];

    const ordered = [];
    orderedSelectors.forEach((selector) => {
      modal.querySelectorAll(selector).forEach((el) => {
        if (isVisible(el)) ordered.push(el);
      });
    });

    return ordered.length ? ordered : null;
  }

  function moveGridFocus(direction) {
    const container = getGridContainerForFocus();
    const active = document.activeElement;
    if (!container || !active) return false;

    const items = Array.from(container.querySelectorAll('.anime-card, .music-track-card, .music-card')).filter(isVisible);
    if (!items.length) return false;

    const positions = items.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        el,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    const current = positions.find((p) => p.el === active);
    if (!current) return false;

    if (direction === 'left' || direction === 'right') {
      const sameRow = positions
        .filter((p) => Math.abs(p.y - current.y) < 28)
        .sort((a, b) => a.x - b.x);
      const idx = sameRow.findIndex((p) => p.el === active);
      if (idx === -1) return false;
      const next = direction === 'right'
        ? sameRow[(idx + 1) % sameRow.length]
        : sameRow[(idx - 1 + sameRow.length) % sameRow.length];
      if (!next) return false;
      next.el.focus();
      next.el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
      return true;
    }

    const candidates = positions
      .filter((p) => direction === 'down' ? p.y > current.y + 10 : p.y < current.y - 10)
      .sort((a, b) => Math.abs(a.y - current.y) * 100 + Math.abs(a.x - current.x) - (Math.abs(b.y - current.y) * 100 + Math.abs(b.x - current.x)));

    const target = candidates[0] || (direction === 'down' ? positions[0] : positions[positions.length - 1]);
    if (!target) return false;
    target.el.focus();
    target.el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
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
      '.music-card',
      '.music-track-card',
      '.btn',
      '.btn-icon',
      '.close-modal-btn',
      '.close-modal',
      'nav a',
      '#season-select',
      '#episode-select',
      '.video-collection-chip'
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
      nextElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
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
      if (!closeTopModal()) {
        if (!focusActiveNavItem() && window.history.length > 1) {
          window.history.back();
        } else {
          setSidebarExpanded(true);
        }
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
      event.target.readOnly = true;
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

      const topModal = getTopVisibleModal();
      if (topModal) {
        if (topModal.id === 'video-modal') {
          const videoModalOrderedTargets = getVideoModalTvNavigationList();
          if (moveFocusInList(videoModalOrderedTargets, arrowDirection)) return;
        }
        const profileOrderedTargets = getProfileModalFocusableInOrder();
        if (!moveFocusInList(profileOrderedTargets, arrowDirection)) {
          focusInDirection(arrowDirection);
        }
        return;
      }

      const sidebarOrderedTargets = getSidebarFocusableInOrder();
      const active = document.activeElement;
      if (active && isInSidebar(active) && (arrowDirection === 'up' || arrowDirection === 'down')) {
        if (moveFocusInList(sidebarOrderedTargets, arrowDirection)) return;
      }
      if (active && isInSidebar(active) && arrowDirection === 'right') {
        if (focusFirstContentItem()) return;
      }
      if (active && active.closest && active.closest('#new-releases-grid') && arrowDirection === 'down') {
        const firstCatalog = document.querySelector('#full-catalog-grid .anime-card');
        if (firstCatalog) {
          firstCatalog.focus();
          firstCatalog.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
          return;
        }
      }
      if (active && active.closest && active.closest('#full-catalog-grid') && arrowDirection === 'up') {
        const releases = Array.from(document.querySelectorAll('#new-releases-grid .anime-card')).filter(isVisible);
        const firstCatalog = document.querySelector('#full-catalog-grid .anime-card');
        if (releases.length && firstCatalog && active === firstCatalog) {
          const lastRelease = releases[releases.length - 1];
          lastRelease.focus();
          lastRelease.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
          return;
        }
      }
      if (active && !isInSidebar(active)) {
        if (moveGridFocus(arrowDirection)) return;

        const localLoopList = getFocusedLoopList(arrowDirection);
        if (localLoopList && moveFocusInList(localLoopList, arrowDirection)) return;

        const contentOrderedTargets = getContentFocusableInOrder();
        if (arrowDirection === 'left') {
          if (moveFocusInList(contentOrderedTargets, 'left')) return;
          if (focusActiveNavItem()) return;
        }
        if (arrowDirection === 'right') {
          if (moveFocusInList(contentOrderedTargets, 'right')) return;
        }
        if (arrowDirection === 'up' || arrowDirection === 'down') {
          if (moveFocusInList(contentOrderedTargets, arrowDirection)) return;
        }
      }

      if (active && !isInSidebar(active) && arrowDirection === 'left') {
        if (focusActiveNavItem()) return;
      }

      focusInDirection(arrowDirection);
      return;
    }

    switch (event.keyCode) {
      case KEY_CODES.ENTER: {
        const active = document.activeElement;
        if (active && active.matches && active.matches('#profile-name, #profile-password')) {
          const currentValue = active.value || '';
          const label = active.id === 'profile-password' ? 'Digite a senha do perfil' : 'Digite o nome do perfil';
          const typed = window.prompt(label, currentValue);
          if (typed !== null) {
            active.value = typed;
            active.dispatchEvent(new Event('input', { bubbles: true }));
            active.dispatchEvent(new Event('change', { bubbles: true }));
          }
          active.readOnly = true;
          return;
        }
        if (active && active.tagName === 'SELECT') {
          active.focus();
          active.click();
          event.preventDefault();
          return;
        }
        if (active && !isTypingTarget(active) && typeof active.click === 'function') {
          active.click();
          event.preventDefault();
          return;
        }
        if (active && active.querySelector) {
          const nestedButton = active.querySelector('button, .btn, [role="button"]');
          if (nestedButton && typeof nestedButton.click === 'function') {
            nestedButton.click();
            event.preventDefault();
          }
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
        const root = getActiveNavigationRoot();
        if (root && root.dataset) {
          root.dataset.tvFocusStamp = String(Date.now());
        }
        markTvFocusable(document);
        syncVideoModalState();
        scheduled = false;
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initTvRemoteSupport() {
    if (!isTvNavigationRuntime()) return;

    localStorage.setItem('aniverse_tv_mode', '1');
    document.body.classList.add('tv-mode');
    ensureTvControlsHint();
    forceDarkThemeForTvMode();
    syncVideoModalState();
    registerTizenKeys();
    applyZoom(localStorage.getItem(ZOOM_KEY) || DEFAULT_ZOOM);
    markTvFocusable(document);
    initTvMutationObserver();
    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('focusin', () => {
      setSidebarExpanded(isInSidebar(document.activeElement));
      updateTvControlsHintContext(document.activeElement);
      if (document.activeElement && document.activeElement.matches && document.activeElement.matches('nav a[data-section]')) {
        document.querySelectorAll('nav a[data-section].active').forEach((el) => el.classList.remove('active'));
        document.activeElement.classList.add('active');
      }
    });

    document.querySelectorAll('nav a[data-section]').forEach((link) => {
      link.addEventListener('click', () => {
        setTimeout(() => {
          setSidebarExpanded(false);
          focusFirstContentItem();
          const root = getActiveNavigationRoot();
          if (root && root.dataset) root.dataset.tvFocusStamp = String(Date.now());
        }, 120);
      });
    });

    let cardPreviewTimer = null;
    let cardPreviewTarget = null;
    const clearCardPreview = () => {
      if (cardPreviewTimer) clearTimeout(cardPreviewTimer);
      cardPreviewTimer = null;
      if (cardPreviewTarget) cardPreviewTarget.classList.remove('tv-hover-preview');
      cardPreviewTarget = null;
    };

    document.addEventListener('focusin', (event) => {
      const card = event.target.closest && event.target.closest('.anime-card');
      clearCardPreview();
      if (!card) return;
      cardPreviewTarget = card;
      cardPreviewTimer = setTimeout(() => {
        if (document.activeElement && card.contains(document.activeElement)) {
          card.classList.add('tv-hover-preview');
        }
      }, 5000);
    });

    document.addEventListener('focusout', () => {
      clearCardPreview();
    });

    ['profile-name', 'profile-password'].forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.readOnly = true;
      input.addEventListener('blur', () => {
        input.readOnly = true;
      });
    });
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
        setSidebarExpanded(true);
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
