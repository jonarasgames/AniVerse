// js/info-section.js - defensive init
(function(){
  try {
    const infoSection = document.getElementById('info-section');
    if (!infoSection) {
      console.info('Info section not found, skipping initialization');
      return;
    }
    const toggleBtn = infoSection.querySelector('.info-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', () => infoSection.classList.toggle('open'));
  } catch (err) {
    console.error('Erro na inicialização de info-section:', err);
  }
})();
