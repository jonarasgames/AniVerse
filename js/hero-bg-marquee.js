/* js/hero-bg-marquee.js - Faixa horizontal 16/9 rolando no fundo do hero.
   SCROLL INFINITO de verdade: quando uma capa sai pela esquerda, ela é
   removida e uma NOVA capa aleatória entra pela direita — sem nunca
   parar, sem reiniciar e sem corte seco.
   A rolagem é via requestAnimationFrame (transform), então o modo
   desempenho / "reduzir movimento" do site não congela a faixa. */
(function () {
  'use strict';

  var INITIAL_IMAGES = 14;
  var SPEED_PX_PER_SEC = 115; // velocidade da rolagem

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function extractPool(data) {
    var list = Array.isArray(data) ? data : (data && data.animes) || [];
    var urls = [];
    list.forEach(function (anime) {
      var src = anime.thumbnail || anime.cover || anime.banner || '';
      if (src && urls.indexOf(src) === -1) urls.push(src);
    });
    return urls;
  }

  function init() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var marquee = document.createElement('div');
    marquee.className = 'hero-bg-marquee';
    marquee.setAttribute('aria-hidden', 'true');
    var track = document.createElement('div');
    track.className = 'hero-bg-track';
    marquee.appendChild(track);
    hero.insertBefore(marquee, hero.firstChild);

    var pool = [];
    var queue = []; // capas embaralhadas esperando para entrar
    var offset = 0;
    var lastTime = null;
    var heroVisible = true;
    var started = false;
    var modal = document.getElementById('video-modal');

    function nextSrc() {
      if (!pool.length) return '';
      if (!queue.length) queue = shuffle(pool);
      // Evita repetir uma das últimas capas da faixa
      var recent = [];
      var children = track.children;
      for (var i = Math.max(0, children.length - 3); i < children.length; i++) {
        recent.push(children[i].getAttribute('src'));
      }
      for (var tries = 0; tries < queue.length; tries++) {
        var candidate = queue[0];
        if (recent.indexOf(candidate) === -1 || queue.length <= recent.length) {
          queue.shift();
          return candidate;
        }
        queue.push(queue.shift()); // joga para o fim e tenta a próxima
      }
      return queue.shift() || pool[0];
    }

    function appendImage() {
      var src = nextSrc();
      if (!src) return;
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'eager';
      img.decoding = 'async';
      img.draggable = false;
      track.appendChild(img);
    }

    function fillTrack() {
      while (track.children.length < INITIAL_IMAGES) appendImage();
    }

    function isModalOpen() {
      if (!modal) return false;
      if (modal.getAttribute('aria-hidden') === 'false') return true;
      return window.getComputedStyle(modal).display !== 'none';
    }

    function shouldPause() {
      return document.hidden || !heroVisible || isModalOpen();
    }

    function step(now) {
      window.requestAnimationFrame(step);
      if (lastTime === null) lastTime = now;
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!started || shouldPause()) return;

      offset += SPEED_PX_PER_SEC * dt;

      // Capa saiu por completo pela esquerda? Remove e entra outra nova.
      var first = track.firstElementChild;
      while (first && first.offsetWidth > 0 && offset >= first.offsetWidth) {
        offset -= first.offsetWidth;
        track.removeChild(first);
        appendImage();
        first = track.firstElementChild;
      }
      fillTrack();
      track.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
    }

    function start(poolUrls) {
      if (!poolUrls.length || started) return;
      pool = poolUrls;
      started = true;
      fillTrack();
    }

    function loadPool() {
      if (window.animeDB && Array.isArray(window.animeDB.animes) && window.animeDB.animes.length) {
        start(extractPool(window.animeDB.animes));
        return;
      }
      fetch('anime-data.json', { cache: 'no-store' })
        .then(function (res) { return res.json(); })
        .then(function (data) { start(extractPool(data)); })
        .catch(function () {});
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0.02 }).observe(hero);
    }

    window.requestAnimationFrame(step);

    window.addEventListener('animeDataLoaded', loadPool);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadPool);
    } else {
      loadPool();
    }
    // Fallbacks caso o evento animeDataLoaded já tenha passado
    setTimeout(loadPool, 1500);
    setTimeout(loadPool, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
