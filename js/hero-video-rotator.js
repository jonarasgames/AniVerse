(function(){
  const VIDEO_BG_URLS = [
    "https://cdn.pixabay.com/video/2023/03/07/131772-813033870_large.mp4",
    "https://cdn.pixabay.com/video/2022/08/05/126858-827650220_large.mp4",
    "https://cdn.pixabay.com/video/2023/06/15/164244-828306808_large.mp4",
    "https://cdn.pixabay.com/video/2023/09/22/177474-866787937_large.mp4",
    "https://cdn.pixabay.com/video/2023/01/05/140554-857498760_large.mp4",
    "https://cdn.pixabay.com/video/2023/02/04/143992-858159773_large.mp4",
    "https://cdn.pixabay.com/video/2022/11/15/123672-839180416_large.mp4",
    "https://cdn.pixabay.com/video/2023/06/25/164732-831518729_large.mp4",
    "https://cdn.pixabay.com/video/2022/03/09/107251-805541893_large.mp4",
    "https://cdn.pixabay.com/video/2021/07/21/86281-573046068_large.mp4",
    "https://cdn.pixabay.com/video/2022/06/15/117882-818220407_large.mp4",
    "https://cdn.pixabay.com/video/2022/05/20/116389-814689065_large.mp4"
  ];

  const ROTATE_INTERVAL = 8000;
  const MOBILE_MAX_WIDTH = 700;

  function isMobile() {
    return window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  }

  function createVideoEl(src) {
    const v = document.createElement('video');
    v.src = src;
    v.autoplay = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.className = 'hero-video-layer';
    v.style.objectFit = 'cover';
    v.style.width = '100%';
    v.style.height = '100%';
    v.style.pointerEvents = 'none';
    v.removeAttribute('controls');
    return v;
  }

  function init() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (isMobile()) { hero.classList.add('hero-static-fallback'); return; }

    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    layerA.className = 'hero-video-container layer-a';
    layerB.className = 'hero-video-container layer-b';
    Object.assign(layerA.style, { position:'absolute', inset:'0', zIndex:'0', opacity:'0', transition:'opacity 1200ms ease' });
    Object.assign(layerB.style, { position:'absolute', inset:'0', zIndex:'0', opacity:'0', transition:'opacity 1200ms ease' });
    hero.appendChild(layerA);
    hero.appendChild(layerB);

    let currentIndex = 0;
    let showingA = true;
    const aVideo = createVideoEl(VIDEO_BG_URLS[0]);
    layerA.appendChild(aVideo);
    aVideo.play().catch(()=>{});

    function crossfadeNext() {
      const nextIndex = (currentIndex + 1) % VIDEO_BG_URLS.length;
      const targetLayer = showingA ? layerB : layerA;
      targetLayer.innerHTML = '';
      const nextVideo = createVideoEl(VIDEO_BG_URLS[nextIndex]);
      targetLayer.appendChild(nextVideo);
      nextVideo.play().catch(()=>{});
      setTimeout(()=> {
        targetLayer.style.opacity = '1';
        (showingA ? layerA : layerB).style.opacity = '0';
        showingA = !showingA;
        currentIndex = nextIndex;
      }, 50);
    }

    setTimeout(()=> { layerA.style.opacity = '1'; }, 200);
    const rotator = setInterval(crossfadeNext, ROTATE_INTERVAL);
    window.addEventListener('beforeunload', () => clearInterval(rotator));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
