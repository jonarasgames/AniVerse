(function () {
  // Pequenos vídeos (sem som) com cenas estilo anime
  const HERO_VIDEO_URLS = [
    'https://media3.giphy.com/media/13BORq7Zo2kulO/giphy.mp4',
    'https://media3.giphy.com/media/R1G43jXwLWsxO/giphy.mp4',
    'https://media3.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.mp4',
    'https://media3.giphy.com/media/9rZgYgDFQJgGs/giphy.mp4'
  ];

  const ROTATE_INTERVAL = 9000;

  function createVideoLayer(src) {
    const container = document.createElement('div');
    container.className = 'hero-video-container';
    Object.assign(container.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '0',
      opacity: '0',
      transition: 'opacity 900ms ease'
    });

    const video = document.createElement('video');
    video.className = 'hero-video-layer';
    video.src = src;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.controls = false;
    video.defaultMuted = true;
    video.setAttribute('muted', 'muted');

    container.appendChild(video);
    return { container, video };
  }

  function swapSource(layerObj, src) {
    const { video } = layerObj;
    if (!video) return;
    video.pause();
    video.src = src;
    video.load();
    video.play().catch(() => {});
  }

  function init() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const layerA = createVideoLayer(HERO_VIDEO_URLS[0]);
    const layerB = createVideoLayer(HERO_VIDEO_URLS[1]);

    hero.appendChild(layerA.container);
    hero.appendChild(layerB.container);

    layerA.video.play().catch(() => {});

    let currentIndex = 0;
    let showingA = true;

    setTimeout(() => {
      layerA.container.style.opacity = '1';
    }, 120);

    function rotate() {
      const nextIndex = (currentIndex + 1) % HERO_VIDEO_URLS.length;
      const nextLayer = showingA ? layerB : layerA;
      const currentLayer = showingA ? layerA : layerB;

      swapSource(nextLayer, HERO_VIDEO_URLS[nextIndex]);
      nextLayer.container.style.opacity = '1';
      currentLayer.container.style.opacity = '0';

      currentIndex = nextIndex;
      showingA = !showingA;
    }

    const intervalId = setInterval(rotate, ROTATE_INTERVAL);
    window.addEventListener('beforeunload', () => clearInterval(intervalId));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
