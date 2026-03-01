(function () {
  // Pequenos vídeos (sem som) com cenas estilo anime
  const HERO_VIDEO_URLS = [
    'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyam13YnoxcnNhOGpkOXg2eHp0bXh2YWhrZ3FvNHl1Yzh6Y3kwazJtZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FIZ1QC610AAhi/giphy.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyMnhveXYxM202ZHdycm4xaXR2eGo4ZWU3Z3Z0b3gzOXVpcDg4dnUwaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/k63gNYkfIxbwY/giphy.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyMTVma21xY3ZvbzF1YjdpM3lvaHZ1bTF6bnI5aTZycXFwcG9hNTE3MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uB2szZH5JSIU0/giphy.gif',
    'https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUyZmc5ZnJibThnaGRwbnljODhoNHR4cm85bDdxazZwMXlmZWRtY3VmZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ftZ8Smav6dMPe3e99W/giphy.gif',
    'https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyeWNnOHZzemo1aWxqcGRoaGxibjhnd3VwdDBsZHlzN2YyMnBycjlsdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9dg/KWYQJh3lldhemCEFaP/giphy.gif',
    'https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyc3I1a3M2OHducWZkODZ4MmlucmR1aWlndHAyOWtnMHlyc2p2dTR5NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9dg/WveVPjLbE3H22747UO/giphy.gif'
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
