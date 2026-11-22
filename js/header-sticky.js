/* js/header-sticky.js - Barra superior fixa ao rolar.
   No topo ela fica normal (no fluxo); ao descer, gruda no topo (sticky).
   Ao voltar ao topo, volta ao normal e rola para fora da tela. */
(function () {
  'use strict';

  function init() {
    var header = document.querySelector('header');
    if (!header) return;

    var ticking = false;

    function update() {
      ticking = false;
      // Marca quando a barra está grudada no topo (rolagem > 0)
      header.classList.toggle('is-stuck', window.scrollY > 4);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
