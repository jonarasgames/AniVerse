/* js/hero-bg-marquee.js - Faixa horizontal 16/9 rolando no fundo do hero.
   SCROLL INFINITO de verdade: quando uma capa sai pela esquerda, ela é
   removida e uma NOVA capa aleatória entra pela direita — sem nunca
   parar, sem reiniciar e sem corte seco.
   A rolagem é via requestAnimationFrame (transform), então o modo
   desempenho / "reduzir movimento" do site não congela a faixa. */
(function () {
  'use strict';

  var MAX_IMAGES = 14;
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
    var heroVisible = !('IntersectionObserver' in window);
    var frame = 0;
    var cardWidth = 0;
    var imageCount = 0;
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
      img.alt = '';
      img.loading = 'eager';
      img.fetchPriority = 'low';
      img.src = src;
      img.decoding = 'async';
      img.draggable = false;
      track.appendChild(img);
    }

    function fillTrack() {
      while (track.children.length < imageCount) appendImage();
    }

    function isModalOpen() {
      if (!modal) return false;
      if (modal.getAttribute('aria-hidden') === 'false') return true;
      return window.getComputedStyle(modal).display !== 'none';
    }

    function shouldPause() {
      return document.hidden || !heroVisible;
    }

    function syncAnimation() {
      if (!started || shouldPause() || isModalOpen()) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        lastTime = null;
        return;
      }
      if (!frame) {
        fillTrack();
        frame = window.requestAnimationFrame(step);
      }
    }

    function resizeTrack() {
      cardWidth = hero.clientHeight * 16 / 9;
      imageCount = cardWidth ? Math.min(MAX_IMAGES, Math.ceil(hero.clientWidth / cardWidth) + 2) : 0;
      while (track.children.length > imageCount) track.lastElementChild.remove();
      syncAnimation();
    }

    function step(now) {
      frame = 0;
      if (shouldPause() || !cardWidth) { lastTime = null; return; }
      var dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      offset += SPEED_PX_PER_SEC * dt;
      while (offset >= cardWidth && track.firstElementChild) {
        offset -= cardWidth;
        track.firstElementChild.remove();
        appendImage();
      }
      track.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
      frame = window.requestAnimationFrame(step);
    }

    function loadPool() {
      if (started) return;
      pool = extractPool(window.animeDB?.animes);
      if (!pool.length) return;
      started = true;
      resizeTrack();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        syncAnimation();
      }, { threshold: 0.02 }).observe(hero);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resizeTrack).observe(hero);
    else window.addEventListener('resize', resizeTrack);
    if (modal) new MutationObserver(syncAnimation).observe(modal, { attributes: true, attributeFilter: ['style', 'aria-hidden'] });
    document.addEventListener('visibilitychange', syncAnimation);
    window.addEventListener('animeDataLoaded', loadPool);
    loadPool();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
