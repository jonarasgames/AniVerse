(function(){
  const VIDEO_BG_URLS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4"
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
