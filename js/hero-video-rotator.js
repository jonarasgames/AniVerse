(function () {
  const HERO_GIF_URLS = [
    'https://media.giphy.com/media/13BORq7Zo2kulO/giphy.gif',
    'https://media.giphy.com/media/R1G43jXwLWsxO/giphy.gif',
    'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
    'https://media.giphy.com/media/9rZgYgDFQJgGs/giphy.gif'
  ];

  const ROTATE_INTERVAL = 7000;

  function createLayer(src) {
    const layer = document.createElement('div');
    layer.className = 'hero-video-container';
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '0',
      opacity: '0',
      transition: 'opacity 900ms ease',
      backgroundImage: `url("${src}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    });
    return layer;
  }

  function init() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const layerA = createLayer(HERO_GIF_URLS[0]);
    const layerB = createLayer(HERO_GIF_URLS[1]);

    hero.appendChild(layerA);
    hero.appendChild(layerB);

    let currentIndex = 0;
    let showingA = true;

    setTimeout(() => {
      layerA.style.opacity = '1';
    }, 120);

    function rotate() {
      const nextIndex = (currentIndex + 1) % HERO_GIF_URLS.length;
      const nextLayer = showingA ? layerB : layerA;
      const currentLayer = showingA ? layerA : layerB;

      nextLayer.style.backgroundImage = `url("${HERO_GIF_URLS[nextIndex]}")`;
      nextLayer.style.opacity = '1';
      currentLayer.style.opacity = '0';

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
