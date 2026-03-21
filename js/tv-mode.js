(function () {
  'use strict';

  const KEY = {
    LEFT: 'left',
    RIGHT: 'right',
    UP: 'up',
    DOWN: 'down',
    ENTER: 'enter',
    BACK: 'back',
    CHANNEL_UP: 'channel_up',
    CHANNEL_DOWN: 'channel_down'
  };

  const ICONS = {
    home: 'fa-house',
    animes: 'fa-tv',
    movies: 'fa-film',
    ovas: 'fa-clapperboard',
    openings: 'fa-music',
    profile: 'fa-user-circle',
    theme: 'fa-circle-half-stroke'
  };
  const TV_MENU_ORDER = ['home', 'animes', 'movies', 'ovas', 'openings'];

  let tvEnabled = false;
  let currentFocus = null;
  let currentInputShell = null;
  let lastNonSidebarFocus = null;
  let hoverTimer = null;
  let hoverPanel = null;
  let lastFocusedAnime = null;
  let zoomLevel = Number(localStorage.getItem('aniverseTvZoom') || '1');
  let refreshTimer = null;
  let mutationObserver = null;
  let modalStateObservers = [];

  function isTvMode() {
    return tvEnabled && document.body.classList.contains('tv-mode');
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function detectTvMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tv') === '0') return false;
    if (params.get('tv') === '1') return true;
    if (localStorage.getItem('aniverseTvMode') === 'enabled') return true;
    if (window.__ANIVERSE_FORCE_TV_MODE__ === true) return true;
    if (typeof window.tizen !== 'undefined' || typeof window.webapis !== 'undefined') return true;

    const ua = navigator.userAgent || '';
    if (/tizen|smart-tv|smarttv|hbbtv|web0s|googletv|appletv|viera|aquos/i.test(ua)) return true;

    const protocolLooksLikeTvApp = /^(file|app|widget):$/i.test(window.location.protocol || '');
    if (protocolLooksLikeTvApp) return true;

    const hasTouchlessLargeScreen = (() => {
      try {
        const noHover = window.matchMedia('(hover: none)').matches;
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const largeDisplay = Math.max(window.screen?.width || 0, window.screen?.height || 0) >= 1200;
        return noHover && coarsePointer && largeDisplay;
      } catch (_) {
        return false;
      }
    })();

    return hasTouchlessLargeScreen;
  }

  function registerTizenKeys() {
    try {
      const tvinputdevice = window.tizen && window.tizen.tvinputdevice;
      if (!tvinputdevice || typeof tvinputdevice.registerKey !== 'function') return;
      ['ChannelUp', 'ChannelDown', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'MediaPlayPause', 'MediaPlay', 'MediaPause'].forEach((key) => {
        try { tvinputdevice.registerKey(key); } catch (_) {}
      });
    } catch (_) {}

    window.addEventListener('tizenhwkey', (event) => {
      if (!isTvMode()) return;
      if (event && event.keyName === 'back') {
        event.preventDefault();
        handleCommand(KEY.BACK);
      }
    });
  }

  function toCommand(event) {
    const code = event.keyCode;
    switch (event.key) {
      case 'ArrowLeft': return KEY.LEFT;
      case 'ArrowRight': return KEY.RIGHT;
      case 'ArrowUp': return KEY.UP;
      case 'ArrowDown': return KEY.DOWN;
      case 'Enter':
      case 'OK': return KEY.ENTER;
      case 'Escape':
      case 'GoBack':
      case 'Backspace': return KEY.BACK;
      case 'ChannelUp': return KEY.CHANNEL_UP;
      case 'ChannelDown': return KEY.CHANNEL_DOWN;
      default: break;
    }
    if (code === 37) return KEY.LEFT;
    if (code === 38) return KEY.UP;
    if (code === 39) return KEY.RIGHT;
    if (code === 40) return KEY.DOWN;
    if (code === 13) return KEY.ENTER;
    if (code === 10009 || code === 461 || code === 27 || code === 8) return KEY.BACK;
    if (code === 427) return KEY.CHANNEL_UP;
    if (code === 428) return KEY.CHANNEL_DOWN;
    return null;
  }

  function getFocusableElements() {
    const scope = getActiveScope();
    const selectors = [
      '.tv-sidebar-link',
      '.tv-focusable',
      '#tv-details-modal.active .tv-action-btn',
      '#tv-details-modal.active .tv-episode-button',
      '#tv-details-modal.active .tv-similar-card',
      '#video-modal[style*="flex"] .tv-focusable',
      '#profile-modal.active .tv-focusable',
      '#profile-selection-overlay .tv-focusable'
    ];
    return Array.from(scope.querySelectorAll(selectors.join(','))).filter(isVisible);
  }

  function getActiveScope() {
    const tvDetails = document.getElementById('tv-details-modal');
    if (tvDetails && tvDetails.classList.contains('active')) return tvDetails;
    const profileModal = document.getElementById('profile-modal');
    if (profileModal && isOverlayOpen(profileModal, { activeClass: 'active' }) && isVisible(profileModal)) return profileModal;
    const profileOverlay = document.getElementById('profile-selection-overlay');
    if (profileOverlay && isVisible(profileOverlay)) return profileOverlay;
    const videoModal = document.getElementById('video-modal');
    if (videoModal && window.getComputedStyle(videoModal).display !== 'none') return videoModal;
    return document.body;
  }

  function isOverlayOpen(element, options = {}) {
    if (!element) return false;
    if (options.activeClass && element.classList.contains(options.activeClass)) return true;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function updateSidebarState(forceOpen) {
    if (!isTvMode()) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !!(currentFocus && currentFocus.classList.contains('tv-sidebar-link'));
    document.body.classList.toggle('tv-sidebar-open', shouldOpen);
  }

  function clearFocus() {
    if (currentFocus) currentFocus.classList.remove('tv-focus');
  }

  function focusElement(el, options = {}) {
    if (!el || !isVisible(el)) return;
    clearFocus();
    currentFocus = el;
    el.classList.add('tv-focus');
    if (el.classList.contains('tv-sidebar-link')) {
      updateSidebarState(true);
    } else {
      lastNonSidebarFocus = el;
      updateSidebarState(false);
    }
    if (!options.silent) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    updateHelpBar(el);
    scheduleHoverPanel(el);
  }

  function scheduleHoverPanel(el) {
    clearTimeout(hoverTimer);
    removeHoverPanel();
    if (!el || !el.matches('.anime-card, .tv-similar-card')) return;
    hoverTimer = window.setTimeout(() => showHoverPanel(el), 5000);
  }

  function getAnimeDataFromElement(el) {
    const animeId = Number(el?.dataset?.animeId);
    if (!animeId || !window.animeDB || !Array.isArray(window.animeDB.animes)) return null;
    return window.animeDB.animes.find((item) => Number(item.id) === animeId) || null;
  }

  function showHoverPanel(el) {
    const anime = getAnimeDataFromElement(el);
    if (!anime) return;
    lastFocusedAnime = anime;
    const rect = el.getBoundingClientRect();
    hoverPanel = document.createElement('div');
    hoverPanel.className = 'tv-card-hover-panel';
    const meta = [anime.type || 'Anime', anime.year || anime.releaseYear || anime.ano || 'Sem ano'].filter(Boolean).join(' • ');
    const content = Array.isArray(anime.rating_content) ? anime.rating_content.join(' • ') : '';
    hoverPanel.innerHTML = `
      <h3>${anime.title || anime.name || 'Sem título'}</h3>
      <div class="tv-hover-meta">${meta}</div>
      <div class="tv-hover-description">${anime.description || 'Descrição indisponível.'}</div>
      <div class="tv-hover-rating">${anime.rating_age ? `<strong>${anime.rating_age}</strong>` : ''}${content ? `<span>${content}</span>` : ''}</div>
    `;
    document.body.appendChild(hoverPanel);
    const panelRect = hoverPanel.getBoundingClientRect();
    const top = Math.max(24, Math.min(window.innerHeight - panelRect.height - 24, rect.top));
    const left = rect.right + panelRect.width + 24 < window.innerWidth
      ? rect.right + 16
      : Math.max(20, rect.left - panelRect.width - 16);
    hoverPanel.style.top = `${top}px`;
    hoverPanel.style.left = `${left}px`;
  }

  function removeHoverPanel() {
    if (hoverPanel) hoverPanel.remove();
    hoverPanel = null;
  }

  function getRectCenter(el) {
    const rect = el.getBoundingClientRect();
    return { el, rect, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function getContainerOrientation(container) {
    if (!container) return null;
    if (container.matches('#full-catalog-grid, #animes-grid, #movies-grid, #ovas-grid, #continue-grid')) return 'vertical';
    if (container.matches('#new-releases-grid, #continue-watching-grid, #collections-grid, .collection-animes, .music-tracks, .tv-season-strip, .tv-episode-strip, .tv-similar-strip, .pronoun-pills, .customization-tabs')) return 'horizontal';
    if (container.matches('.color-grid, .background-images-grid, .character-grid, .frame-grid')) return 'grid';
    return null;
  }

  function getNavigationContainer(element) {
    return element?.closest?.(
      '#new-releases-grid, #continue-watching-grid, #full-catalog-grid, #animes-grid, #movies-grid, #ovas-grid, #continue-grid, #collections-grid, .collection-animes, .music-tracks, .tv-season-strip, .tv-episode-strip, .tv-similar-strip, .pronoun-pills, .customization-tabs, .color-grid, .background-images-grid, .character-grid, .frame-grid'
    ) || null;
  }

  function navigateWithinContainer(direction) {
    const container = getNavigationContainer(currentFocus);
    if (!container) return false;

    const orientation = getContainerOrientation(container);
    if (!orientation) return false;

    const items = Array.from(container.querySelectorAll('.tv-focusable')).filter(isVisible);
    if (!items.length) return false;

    const currentIndex = items.indexOf(currentFocus);
    if (currentIndex === -1) return false;

    if (orientation === 'horizontal') {
      if (direction !== KEY.LEFT && direction !== KEY.RIGHT) return false;
      const nextIndex = direction === KEY.RIGHT
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
      focusElement(items[nextIndex]);
      return true;
    }

    if (orientation === 'vertical') {
      if (direction !== KEY.UP && direction !== KEY.DOWN) return false;
      const nextIndex = direction === KEY.DOWN
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
      focusElement(items[nextIndex]);
      return true;
    }

    if (orientation === 'grid') {
      const rows = groupElementsByTop(items);
      const rowIndex = rows.findIndex((row) => row.includes(currentFocus));
      if (rowIndex === -1) return false;
      const row = rows[rowIndex];
      const colIndex = row.indexOf(currentFocus);

      if (direction === KEY.LEFT || direction === KEY.RIGHT) {
        const nextCol = direction === KEY.RIGHT
          ? (colIndex + 1) % row.length
          : (colIndex - 1 + row.length) % row.length;
        focusElement(row[nextCol]);
        return true;
      }

      if (direction === KEY.UP || direction === KEY.DOWN) {
        const nextRowIndex = (rowIndex + (direction === KEY.DOWN ? 1 : -1) + rows.length) % rows.length;
        const nextRow = rows[nextRowIndex];
        const ratio = row.length > 1 ? colIndex / (row.length - 1) : 0;
        const nextColIndex = nextRow.length > 1 ? Math.round(ratio * (nextRow.length - 1)) : 0;
        focusElement(nextRow[nextColIndex]);
        return true;
      }
    }

    return false;
  }

  function groupElementsByTop(elements, tolerance = 26) {
    const rows = [];
    elements.forEach((element) => {
      const top = element.getBoundingClientRect().top;
      const row = rows.find((entry) => Math.abs(entry.top - top) <= tolerance);
      if (row) {
        row.items.push(element);
      } else {
        rows.push({ top, items: [element] });
      }
    });

    return rows
      .sort((a, b) => a.top - b.top)
      .map((row) => row.items.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left));
  }

  function getProfileModalRows() {
    const modal = document.getElementById('profile-modal');
    if (!modal || !isOverlayOpen(modal, { activeClass: 'active' })) return null;

    const rows = [];
    const pushRow = (elements) => {
      const filtered = (elements || []).filter(isVisible);
      if (filtered.length) rows.push(filtered);
    };

    pushRow([modal.querySelector('#close-profile-modal')]);
    pushRow(Array.from(modal.querySelectorAll('.tv-input-shell')).filter((shell) => shell.querySelector('#profile-name')));
    pushRow(Array.from(modal.querySelectorAll('.pronoun-pill')));
    pushRow(Array.from(modal.querySelectorAll('.tv-input-shell')).filter((shell) => shell.querySelector('#profile-password')));
    pushRow(Array.from(modal.querySelectorAll('.customization-tabs .tab-btn')));

    const activeTab = modal.querySelector('.tab-content.active');
    if (activeTab) {
      const contentItems = Array.from(activeTab.querySelectorAll('.color-option, .bg-image-option, .character-option, .frame-option')).filter(isVisible);
      groupElementsByTop(contentItems).forEach((row) => pushRow(row));
    }

    pushRow([modal.querySelector('#save-profile-btn')]);
    return rows;
  }

  function navigateProfileModal(direction) {
    const rows = getProfileModalRows();
    if (!rows || !rows.length) return false;

    let currentRowIndex = rows.findIndex((row) => row.includes(currentFocus));
    if (currentRowIndex === -1) {
      focusElement(rows[0][0]);
      return true;
    }

    const currentRow = rows[currentRowIndex];
    const currentColIndex = Math.max(0, currentRow.indexOf(currentFocus));

    if (direction === KEY.LEFT || direction === KEY.RIGHT) {
      const nextCol = direction === KEY.RIGHT
        ? (currentColIndex + 1) % currentRow.length
        : (currentColIndex - 1 + currentRow.length) % currentRow.length;
      focusElement(currentRow[nextCol]);
      return true;
    }

    const nextRowIndex = (currentRowIndex + (direction === KEY.DOWN ? 1 : -1) + rows.length) % rows.length;
    const nextRow = rows[nextRowIndex];
    const ratio = currentRow.length > 1 ? currentColIndex / (currentRow.length - 1) : 0;
    const nextColIndex = nextRow.length > 1 ? Math.round(ratio * (nextRow.length - 1)) : 0;
    focusElement(nextRow[nextColIndex]);
    return true;
  }

  function navigate(direction) {
    if (!currentFocus) {
      focusFirstInScope();
      return;
    }

    const active = getActiveScope();
    if (active.id === 'profile-modal' && navigateProfileModal(direction)) {
      return;
    }
    if (active === document.body && navigateWithinContainer(direction)) {
      return;
    }
    if (active.id === 'video-modal') {
      const player = document.getElementById('anime-player');
      if (player && (direction === KEY.LEFT || direction === KEY.RIGHT)) {
        player.currentTime = Math.max(0, Math.min(player.duration || 0, player.currentTime + (direction === KEY.RIGHT ? 10 : -10)));
        return;
      }
    }

    const focusables = getFocusableElements().filter((item) => item !== currentFocus);
    if (!focusables.length) return;

    const current = getRectCenter(currentFocus);
    let candidates = focusables.map(getRectCenter).filter((item) => {
      if (direction === KEY.LEFT) return item.x < current.x - 8;
      if (direction === KEY.RIGHT) return item.x > current.x + 8;
      if (direction === KEY.UP) return item.y < current.y - 8;
      return item.y > current.y + 8;
    });

    if (!candidates.length) {
      candidates = getWrappedCandidates(direction, current, focusables);
    }
    if (!candidates.length) return;

    candidates.sort((a, b) => weightedDistance(a, current, direction) - weightedDistance(b, current, direction));
    focusElement(candidates[0].el);
  }

  function getWrappedCandidates(direction, current, focusables) {
    const items = focusables.map(getRectCenter);
    if (direction === KEY.DOWN || direction === KEY.RIGHT) {
      return items.sort((a, b) => (direction === KEY.DOWN ? a.y - b.y : a.x - b.x));
    }
    return items.sort((a, b) => (direction === KEY.UP ? b.y - a.y : b.x - a.x));
  }

  function weightedDistance(candidate, current, direction) {
    const dx = candidate.x - current.x;
    const dy = candidate.y - current.y;
    if (direction === KEY.LEFT || direction === KEY.RIGHT) {
      return Math.abs(dx) + Math.abs(dy) * 2.4;
    }
    return Math.abs(dy) + Math.abs(dx) * 2.4;
  }

  function clickCurrent() {
    if (!currentFocus) {
      focusFirstInScope();
      return;
    }
    if (currentFocus.classList.contains('tv-input-shell')) {
      toggleInputEdit(currentFocus);
      return;
    }
    currentFocus.click();
  }

  function toggleInputEdit(shell, forceState) {
    const input = shell && shell.querySelector('input');
    if (!input) return;
    const shouldEdit = typeof forceState === 'boolean' ? forceState : currentInputShell !== shell;
    if (shouldEdit) {
      currentInputShell = shell;
      shell.dataset.editing = 'true';
      input.focus({ preventScroll: true });
      input.select?.();
      updateToast('Digite no teclado da TV e pressione OK ou Voltar para sair do campo.');
    } else {
      shell.dataset.editing = 'false';
      currentInputShell = null;
      input.blur();
      focusElement(shell, { silent: true });
    }
  }

  function handleBack() {
    const tvDetails = document.getElementById('tv-details-modal');
    if (tvDetails && tvDetails.classList.contains('active')) {
      closeTvDetails();
      focusSidebar();
      return;
    }

    const profileModal = document.getElementById('profile-modal');
    if (profileModal && isOverlayOpen(profileModal, { activeClass: 'active' })) {
      const closeBtn = document.getElementById('close-profile-modal');
      if (currentInputShell) {
        toggleInputEdit(currentInputShell, false);
      }
      closeBtn?.click();
      focusSidebar();
      return;
    }

    const videoModal = document.getElementById('video-modal');
    if (videoModal && window.getComputedStyle(videoModal).display !== 'none') {
      document.getElementById('close-video')?.click();
      focusSidebar();
      return;
    }

    if (currentInputShell) {
      toggleInputEdit(currentInputShell, false);
      return;
    }

    focusSidebar();
  }

  function focusSidebar() {
    const sidebarLinks = Array.from(document.querySelectorAll('.tv-sidebar-link')).filter(isVisible);
    if (!sidebarLinks.length) return;
    focusElement(sidebarLinks[0]);
  }

  function focusFirstInScope() {
    const preferred = lastNonSidebarFocus && isVisible(lastNonSidebarFocus) ? lastNonSidebarFocus : null;
    if (preferred && getActiveScope().contains(preferred)) {
      focusElement(preferred);
      return;
    }

    const activeScope = getActiveScope();
    const target = Array.from(activeScope.querySelectorAll('.tv-focusable, .tv-sidebar-link')).find(isVisible);
    if (target) focusElement(target);
  }

  function adjustZoom(delta) {
    zoomLevel = Math.min(1.35, Math.max(0.85, Number((zoomLevel + delta).toFixed(2))));
    document.body.style.zoom = String(zoomLevel);
    localStorage.setItem('aniverseTvZoom', String(zoomLevel));
    updateToast(`Zoom ${Math.round(zoomLevel * 100)}%`);
  }

  function updateToast(message) {
    let toast = document.querySelector('.tv-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'tv-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(updateToast._timer);
    updateToast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 2000);
  }

  function handleCommand(command) {
    if (!isTvMode()) return;
    if (command === KEY.LEFT || command === KEY.RIGHT || command === KEY.UP || command === KEY.DOWN) {
      if (currentInputShell) return;
      navigate(command);
      return;
    }
    if (command === KEY.ENTER) {
      clickCurrent();
      return;
    }
    if (command === KEY.BACK) {
      handleBack();
      return;
    }
    if (command === KEY.CHANNEL_UP) {
      adjustZoom(0.05);
      return;
    }
    if (command === KEY.CHANNEL_DOWN) {
      adjustZoom(-0.05);
    }
  }

  function addTvClass(el, className = 'tv-focusable') {
    if (!el) return;
    el.classList.add(className);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  }

  function decorateSidebar() {
    const navList = document.querySelector('nav ul');
    const navLinks = Array.from(document.querySelectorAll('nav a[data-section]'));
    if (navList) {
      const orderedItems = TV_MENU_ORDER
        .map((section) => navLinks.find((link) => link.dataset.section === section))
        .filter(Boolean)
        .map((link) => link.parentElement)
        .filter(Boolean);
      orderedItems.forEach((item) => navList.appendChild(item));
    }

    navLinks.forEach((link) => {
      const section = link.dataset.section;
      const shouldShow = TV_MENU_ORDER.includes(section);
      link.parentElement && (link.parentElement.style.display = shouldShow ? '' : 'none');
      if (!shouldShow) return;
      link.classList.add('tv-sidebar-link');
      const label = link.textContent.trim();
      link.innerHTML = `<span class="tv-nav-icon"><i class="fas ${ICONS[section] || 'fa-circle'}"></i></span><span class="tv-nav-label">${label}</span>`;
      addTvClass(link, 'tv-sidebar-link');
      link.addEventListener('click', () => updateSidebarState(false));
    });

    const userControls = document.querySelector('.user-controls');
    const avatar = document.getElementById('header-avatar');
    if (userControls && avatar && !userControls.querySelector('.user-profile-trigger')) {
      const avatarMarkup = `
        <span class="user-avatar">
          <span class="avatar-bg-layer" style="${document.getElementById('header-avatar-bg')?.style.cssText || ''}"></span>
          <img src="${avatar.querySelector('img')?.getAttribute('src') || ''}" alt="Perfil" class="avatar-char-layer">
          <span class="avatar-frame-layer ${document.getElementById('header-avatar-frame')?.className?.replace('avatar-frame-layer', '').trim() || ''}"></span>
        </span>
      `;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'user-profile-trigger tv-focusable';
      button.innerHTML = `<span class="tv-nav-icon">${avatarMarkup}</span><span class="tv-nav-label">Perfis</span>`;
      button.addEventListener('click', () => {
        if (typeof window.showProfileSelectionScreen === 'function') {
          window.showProfileSelectionScreen();
        } else if (typeof window.openProfileModal === 'function') {
          window.openProfileModal();
        }
      });
      userControls.appendChild(button);
    }

    const themeBtn = document.getElementById('dark-mode-toggle');
    if (themeBtn && !themeBtn.querySelector('.tv-nav-label')) {
      themeBtn.innerHTML = `<span class="tv-nav-icon"><i class="fas ${ICONS.theme}"></i></span><span class="tv-nav-label">Tema</span>`;
      addTvClass(themeBtn);
    }
  }

  function decorateInputs() {
    document.querySelectorAll('#profile-modal input.input-modern').forEach((input) => {
      if (input.closest('.tv-input-shell')) return;
      const shell = document.createElement('div');
      shell.className = 'tv-input-shell tv-focusable';
      input.parentNode.insertBefore(shell, input);
      shell.appendChild(input);
      const hint = document.createElement('div');
      hint.className = 'tv-input-hint';
      hint.textContent = 'OK para editar • Voltar para sair';
      shell.appendChild(hint);
      input.addEventListener('keydown', (event) => {
        if (!isTvMode()) return;
        if (event.key === 'Enter' || event.key === 'Escape' || event.key === 'Backspace') {
          event.stopPropagation();
          event.preventDefault();
          toggleInputEdit(shell, false);
        }
      });
      shell.addEventListener('click', (event) => {
        if (event.target === input) return;
        toggleInputEdit(shell, true);
      });
    });
  }

  function decorateDynamicElements(root = document) {
    root.querySelectorAll('.anime-card, .collection-card, .music-card, .tab-btn, .pronoun-pill, .color-option, .frame-option, .bg-image-option, .character-option, #save-profile-btn, #close-profile-modal, #close-video, #play-pause-btn, #next-episode-btn, #fullscreen-btn, #skip-opening-btn, .btn, button, #profile-selection-overlay [data-tv-profile-card]').forEach(addTvClass);
    root.querySelectorAll('.anime-card, .tv-similar-card').forEach((card) => {
      const animeId = Number(card.dataset.animeId);
      if (!Number.isNaN(animeId)) card.dataset.animeId = String(animeId);
    });
  }

  function ensureHelpBar() {
    if (document.getElementById('tv-help-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'tv-help-bar';
    bar.innerHTML = '<div class="tv-help-content"></div>';
    document.body.appendChild(bar);
  }

  function updateHelpBar(el) {
    const content = document.querySelector('#tv-help-bar .tv-help-content');
    if (!content) return;
    let items;
    if (el && el.closest('#video-modal')) {
      items = [
        ['fa-arrows-left-right', 'Buscar'],
        ['fa-circle-dot', 'OK pausar'],
        ['fa-arrow-rotate-left', 'Voltar menu'],
        ['fa-magnifying-glass-plus', 'CH zoom']
      ];
    } else if (el && el.closest('#profile-modal')) {
      items = [
        ['fa-arrow-up-down-left-right', 'Mover'],
        ['fa-keyboard', 'OK editar'],
        ['fa-arrow-rotate-left', 'Voltar sair'],
        ['fa-floppy-disk', 'Salvar']
      ];
    } else if (el && el.closest('#tv-details-modal')) {
      items = [
        ['fa-play', 'Assistir'],
        ['fa-list', 'Episódios'],
        ['fa-layer-group', 'Coleções'],
        ['fa-arrow-rotate-left', 'Voltar menu']
      ];
    } else {
      items = [
        ['fa-arrow-up-down-left-right', 'Mover'],
        ['fa-circle-dot', 'OK abrir'],
        ['fa-arrow-rotate-left', 'Voltar menu'],
        ['fa-magnifying-glass-plus', 'CH zoom']
      ];
    }
    content.innerHTML = items.map(([icon, label]) => `<span class="tv-help-item"><i class="fas ${icon}"></i><span>${label}</span></span>`).join('');
  }

  function forceDarkMode() {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    localStorage.setItem('aniverse_theme', 'theme-dark');
    localStorage.setItem('darkMode', 'enabled');
  }

  function syncModalIsolation() {
    if (!isTvMode()) return;

    const profileModal = document.getElementById('profile-modal');
    const profileOverlay = document.getElementById('profile-selection-overlay');
    const detailsModal = document.getElementById('tv-details-modal');
    const videoModal = document.getElementById('video-modal');

    const activeOverlay =
      (detailsModal && detailsModal.classList.contains('active') && detailsModal) ||
      (profileModal && isOverlayOpen(profileModal, { activeClass: 'active' }) && profileModal) ||
      (profileOverlay && isOverlayOpen(profileOverlay) && profileOverlay) ||
      (videoModal && isOverlayOpen(videoModal) && videoModal) ||
      null;

    const backgroundNodes = [
      document.querySelector('header'),
      document.querySelector('main'),
      document.querySelector('footer'),
      document.getElementById('news-fab')
    ].filter(Boolean);

    document.body.classList.toggle('tv-modal-open', !!activeOverlay);

    backgroundNodes.forEach((node) => {
      if (activeOverlay) {
        node.setAttribute('aria-hidden', 'true');
        try { node.inert = true; } catch (_) {}
      } else {
        node.removeAttribute('aria-hidden');
        try { node.inert = false; } catch (_) {}
      }
    });

    if (!activeOverlay) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && !activeOverlay.contains(activeElement)) {
      activeElement.blur?.();
    }

    if (currentInputShell && !activeOverlay.contains(currentInputShell)) {
      currentInputShell = null;
    }

    if (!currentFocus || !activeOverlay.contains(currentFocus)) {
      const nextFocus = Array.from(activeOverlay.querySelectorAll('.tv-focusable, .tv-sidebar-link')).find(isVisible);
      if (nextFocus) {
        setTimeout(() => focusElement(nextFocus), 30);
      }
    }
  }

  function disableHeavyHoverTrailers() {
    document.querySelectorAll('.card-hover-trailer').forEach((video) => {
      video.removeAttribute('src');
      video.preload = 'none';
    });
  }

  function ensureRailStartPositions() {
    ['new-releases-grid', 'continue-watching-grid'].forEach((id) => {
      const rail = document.getElementById(id);
      if (!rail || !rail.children.length || rail.dataset.tvRailInitialized === '1') return;
      rail.scrollLeft = 0;
      rail.dataset.tvRailInitialized = '1';
    });
  }

  function scheduleRefresh(reason) {
    if (!isTvMode()) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      decorateDynamicElements(document);
      decorateInputs();
      tuneMediaForTv();
      disableHeavyHoverTrailers();
      ensureRailStartPositions();
      syncModalIsolation();
      if (!currentFocus || !isVisible(currentFocus)) {
        focusFirstInScope();
      }
      window.__tvModeReason = {
        ...(window.__tvModeReason || {}),
        lastRefreshReason: reason || 'scheduled'
      };
    }, 60);
  }

  function ensureTvDetailsModal() {
    let modal = document.getElementById('tv-details-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tv-details-modal';
    modal.className = 'tv-details-modal';
    modal.innerHTML = '<div class="tv-details-shell"></div>';
    document.body.appendChild(modal);
    return modal;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTvDetails(anime, selectedSeason, selectedEpisode) {
    const modal = ensureTvDetailsModal();
    const shell = modal.querySelector('.tv-details-shell');
    if (!anime || !shell) return;

    const seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
    const season = seasons.find((item) => Number(item.number) === Number(selectedSeason)) || seasons[0] || { number: 1, episodes: [] };
    const episodes = Array.isArray(season.episodes) ? season.episodes : [];
    const currentEpisode = episodes[selectedEpisode] || episodes[0] || null;
    const collection = window.animeDB?.getCollectionForAnime?.(anime.id);
    const similar = collection
      ? window.animeDB.getAnimesInCollection(collection.id).filter((item) => Number(item.id) !== Number(anime.id))
      : (window.animeDB?.getAnimesByType?.(anime.type) || []).filter((item) => Number(item.id) !== Number(anime.id)).slice(0, 12);

    shell.innerHTML = `
      <div class="tv-details-hero" style="background-image: linear-gradient(90deg, rgba(7,9,18,.76), rgba(7,9,18,.2)), url('${escapeHtml(anime.banner || anime.cover || anime.thumbnail || 'images/bg-default.jpg')}'); background-size: cover; background-position: center;">
        <div class="tv-details-copy">
          <span class="tv-details-logo">AniVerse TV</span>
          <h2 class="tv-details-title">${escapeHtml(anime.title || anime.name || 'Sem título')}</h2>
          <div class="tv-details-meta">
            <span>${escapeHtml((anime.type || 'anime').toUpperCase())}</span>
            <span>${escapeHtml(anime.year || anime.releaseYear || anime.ano || 'Sem ano')}</span>
            <span>${escapeHtml(anime.rating_age || 'Livre')}</span>
            <span>${episodes.length} episódios</span>
          </div>
          <p class="tv-details-description">${escapeHtml(anime.description || 'Descrição indisponível.')}</p>
          <div class="tv-details-actions">
            <button class="tv-action-btn tv-focusable is-primary" data-tv-action="play" data-season="${season.number}" data-episode="${selectedEpisode || 0}"><i class="fas fa-play"></i> Assistir agora</button>
            <button class="tv-action-btn tv-focusable" data-tv-action="episodes"><i class="fas fa-list"></i> Episódios e mais</button>
            <button class="tv-action-btn tv-focusable" data-tv-action="similar"><i class="fas fa-layer-group"></i> ${collection ? 'Coleção' : 'Títulos similares'}</button>
          </div>
        </div>
        <div class="tv-details-art">
          <img src="${escapeHtml(anime.thumbnail || anime.cover || anime.banner || 'images/bg-default.jpg')}" alt="${escapeHtml(anime.title || anime.name || 'Anime')}">
        </div>
      </div>
      <div class="tv-details-sections">
        <section class="tv-panel">
          <div class="tv-panel-header"><h3>Temporadas</h3><span class="tv-details-meta">Escolha antes de assistir</span></div>
          <div class="tv-season-strip">
            ${seasons.map((item) => `<button class="tv-action-btn tv-focusable ${Number(item.number) === Number(season.number) ? 'is-primary' : ''}" data-tv-season="${item.number}">${escapeHtml(item.name || `Temporada ${item.number}`)}</button>`).join('')}
          </div>
        </section>
        <section class="tv-panel" id="tv-episodes-panel">
          <div class="tv-panel-header"><h3>Episódios e mais</h3><span class="tv-details-meta">Setas esquerda/direita trocam episódio • OK abre player TV</span></div>
          <div class="tv-episode-strip">
            ${episodes.map((ep, index) => `
              <button class="tv-episode-button tv-focusable" data-tv-action="play" data-season="${season.number}" data-episode="${index}">
                <img src="${escapeHtml(anime.thumbnail || anime.cover || anime.banner || 'images/bg-default.jpg')}" alt="${escapeHtml(ep.title || `Episódio ${index + 1}`)}">
                <div class="tv-episode-title">E${index + 1} • ${escapeHtml(ep.title || 'Sem título')}</div>
                <div class="tv-episode-subtitle">${escapeHtml(ep.duration || 'Duração indisponível')}</div>
              </button>
            `).join('')}
          </div>
        </section>
        <section class="tv-panel" id="tv-similar-panel">
          <div class="tv-panel-header"><h3>${collection ? escapeHtml(collection.name) : 'Títulos similares'}</h3><span class="tv-details-meta">Coleções aparecem abaixo da seleção de temporada e episódio</span></div>
          <div class="tv-similar-strip">
            ${similar.map((item) => `
              <button class="tv-similar-card tv-focusable" data-tv-similar="${item.id}" data-anime-id="${item.id}">
                <img src="${escapeHtml(item.thumbnail || item.cover || 'images/bg-default.jpg')}" alt="${escapeHtml(item.title || item.name || 'Anime')}">
                <div class="tv-similar-title">${escapeHtml(item.title || item.name || 'Sem título')}</div>
                <div class="tv-similar-meta">${escapeHtml((item.type || 'anime').toUpperCase())} • ${escapeHtml(item.year || item.releaseYear || item.ano || 'Sem ano')}</div>
              </button>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    decorateDynamicElements(shell);
    shell.querySelectorAll('[data-tv-season]').forEach((button) => {
      button.addEventListener('click', () => {
        renderTvDetails(anime, Number(button.dataset.tvSeason), 0);
        const firstEpisode = shell.querySelector('.tv-episode-button');
        if (firstEpisode) focusElement(firstEpisode);
      });
    });
    shell.querySelectorAll('[data-tv-action="episodes"]').forEach((button) => button.addEventListener('click', () => shell.querySelector('#tv-episodes-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
    shell.querySelectorAll('[data-tv-action="similar"]').forEach((button) => button.addEventListener('click', () => shell.querySelector('#tv-similar-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
    shell.querySelectorAll('[data-tv-action="play"]').forEach((button) => {
      button.addEventListener('click', () => {
        const seasonNumber = Number(button.dataset.season || season.number || 1);
        const episodeNumber = Number(button.dataset.episode || 0);
        closeTvDetails();
        window.__tvLaunchingPlayer = true;
        if (typeof window.__baseOpenAnimeModal === 'function') {
          window.__baseOpenAnimeModal(anime, seasonNumber, episodeNumber);
        }
        setTimeout(() => {
          const controls = document.getElementById('play-pause-btn');
          if (controls) focusElement(controls);
        }, 180);
      });
    });
    shell.querySelectorAll('[data-tv-similar]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextAnime = window.animeDB?.animes?.find((item) => Number(item.id) === Number(button.dataset.tvSimilar));
        if (nextAnime) renderTvDetails(nextAnime, 1, 0);
      });
    });

    modal.classList.add('active');
    setTimeout(() => {
      const primaryButton = shell.querySelector('.tv-action-btn.is-primary') || shell.querySelector('.tv-focusable');
      if (primaryButton) focusElement(primaryButton);
    }, 30);
  }

  function closeTvDetails() {
    const modal = document.getElementById('tv-details-modal');
    if (modal) modal.classList.remove('active');
  }

  function hijackAnimeOpen() {
    if (typeof window.openAnimeModal !== 'function' || window.__baseOpenAnimeModal) return;
    window.__baseOpenAnimeModal = window.openAnimeModal;
    window.openAnimeModal = function (anime, seasonNumber, episodeIndex) {
      if (!isTvMode()) return window.__baseOpenAnimeModal(anime, seasonNumber, episodeIndex);
      renderTvDetails(anime, seasonNumber || 1, typeof episodeIndex === 'number' ? episodeIndex : 0);
    };
  }

  function tuneMediaForTv() {
    const player = document.getElementById('anime-player');
    if (player) {
      player.preload = 'auto';
      player.playsInline = true;
      player.setAttribute('webkit-playsinline', 'true');
    }
    const music = document.getElementById('music-playing-audio');
    if (music) music.preload = 'auto';
  }

  function addObservers() {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver((mutations) => {
      if (!isTvMode()) return;
      const hasRelevantNodes = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes || []).some((node) => {
          return node.nodeType === 1;
        });
      });
      if (hasRelevantNodes) {
        scheduleRefresh('mutation');
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    modalStateObservers.forEach((observer) => observer.disconnect());
    modalStateObservers = [];
    ['profile-modal', 'profile-selection-overlay', 'tv-details-modal', 'video-modal'].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      const observer = new MutationObserver(() => {
        syncModalIsolation();
        scheduleRefresh(`modal:${id}`);
      });
      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
      modalStateObservers.push(observer);
    });
  }

  function exposeHelpers() {
    window.showProfileSelectionScreen = window.showProfileSelectionScreen || null;
    window.__isTvMode = () => isTvMode();
    window.__focusTvElement = focusElement;
  }

  function init() {
    try {
      const detected = detectTvMode();
      window.__tvModeReason = {
        forced: window.__ANIVERSE_FORCE_TV_MODE__ === true,
        query: window.location.search,
        persisted: localStorage.getItem('aniverseTvMode'),
        hasTizen: typeof window.tizen !== 'undefined',
        hasWebapis: typeof window.webapis !== 'undefined',
        userAgent: navigator.userAgent || '',
        active: detected
      };
      if (!detected) return;
      tvEnabled = true;
      localStorage.setItem('aniverseTvMode', 'enabled');
      document.body.classList.add('tv-mode');
      forceDarkMode();
      decorateSidebar();
      decorateDynamicElements(document);
      decorateInputs();
      ensureHelpBar();
      tuneMediaForTv();
      disableHeavyHoverTrailers();
      registerTizenKeys();
      addObservers();
      exposeHelpers();
      syncModalIsolation();

      document.addEventListener('keydown', (event) => {
        if (!isTvMode()) return;
        const command = toCommand(event);
        if (!command) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        handleCommand(command);
      }, true);

      document.addEventListener('click', () => {
        if (!isTvMode()) return;
        scheduleRefresh('click');
      });

      let attempts = 0;
      const timer = setInterval(() => {
        hijackAnimeOpen();
        attempts += 1;
        if (window.__baseOpenAnimeModal || attempts > 20) {
          clearInterval(timer);
          focusFirstInScope();
        }
      }, 200);
    } catch (error) {
      tvEnabled = false;
      document.body.classList.remove('tv-mode', 'tv-sidebar-open');
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      window.__tvModeReason = {
        ...(window.__tvModeReason || {}),
        active: false,
        failed: true,
        error: String(error && error.message ? error.message : error)
      };
      console.error('AniVerse TV mode disabled due to initialization error:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
