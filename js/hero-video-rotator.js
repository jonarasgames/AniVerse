(function () {
  // Pequenos vídeos (sem som) com cenas estilo anime
  const HERO_VIDEO_URLS = [
    'https://media3.giphy.com/media/xUNd9HzQ5cNfL4x6mQ/giphy.mp4',
    'https://media3.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.mp4',
    'https://media3.giphy.com/media/13BORq7Zo2kulO/giphy.mp4',
    'https://media3.giphy.com/media/R1G43jXwLWsxO/giphy.mp4',
    'https://media3.giphy.com/media/9rZgYgDFQJgGs/giphy.mp4',
    'https://media3.giphy.com/media/2y98KScHKeaQM/giphy.mp4'
  ];

  const ROTATE_INTERVAL = 9000;

  function init() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const connection = navigator.connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '') ||
        localStorage.getItem('aniversePerformanceMode') === '1' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.classList.add('hero-static-fallback');
      return;
    }

    // Only one decorative stream is active. Start after the page resources load.
    const container = document.createElement('div');
    container.className = 'hero-video-container';
    const video = document.createElement('video');
    video.className = 'hero-video-layer';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    container.appendChild(video);
    hero.appendChild(container);

    let visible = false;
    let pageReady = document.readyState === 'complete';
    let index = 0;
    let intervalId = null;
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('anime-player');

    function syncPlayback() {
      const modalOpen = modal && getComputedStyle(modal).display !== 'none';
      const shouldPlay = pageReady && visible && !document.hidden && !modalOpen && !(player && !player.paused);
      if (!shouldPlay) {
        clearInterval(intervalId);
        intervalId = null;
        video.pause();
        if (video.hasAttribute('src')) {
          video.removeAttribute('src');
          video.load();
        }
        return;
      }
      if (!video.hasAttribute('src')) video.src = HERO_VIDEO_URLS[index];
      video.play().catch(() => {});
      if (!intervalId) intervalId = setInterval(() => {
        index = (index + 1) % HERO_VIDEO_URLS.length;
        video.src = HERO_VIDEO_URLS[index];
        video.play().catch(() => {});
      }, ROTATE_INTERVAL);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        syncPlayback();
      }).observe(hero);
    } else {
      visible = true;
    }
    if (modal) new MutationObserver(syncPlayback).observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    if (player) {
      player.addEventListener('play', syncPlayback);
      player.addEventListener('pause', syncPlayback);
    }
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('load', () => { pageReady = true; syncPlayback(); }, { once: true });
    window.addEventListener('pagehide', () => { visible = false; syncPlayback(); });
    window.addEventListener('pageshow', () => {
      visible = hero.getClientRects().length > 0 && hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;
      syncPlayback();
    });
    syncPlayback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
