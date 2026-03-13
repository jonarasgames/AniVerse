/* js/anime-editor.js - simple local anime-data editor */
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  function getCurrentPayload() {
    const db = window.animeDB;
    return {
      animes: Array.isArray(db?.animes) ? db.animes : [],
      collections: Array.isArray(db?.collections) ? db.collections : []
    };
  }

  function setStatus(text, isError) {
    const el = byId('anime-editor-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? '#ff6b6b' : '';
  }

  function loadCurrentIntoEditor() {
    const textarea = byId('anime-editor-textarea');
    if (!textarea) return;
    textarea.value = JSON.stringify(getCurrentPayload(), null, 2);
    setStatus('JSON atual carregado.');
  }

  function parseEditorJson() {
    const textarea = byId('anime-editor-textarea');
    if (!textarea) throw new Error('Editor não encontrado.');
    const parsed = JSON.parse(textarea.value || '{}');
    const animes = Array.isArray(parsed) ? parsed : (parsed.animes || []);
    const collections = Array.isArray(parsed.collections) ? parsed.collections : [];
    return { animes, collections };
  }

  function applyToSite() {
    try {
      const parsed = parseEditorJson();
      if (!window.animeDB) throw new Error('animeDB ainda não carregou.');

      window.animeDB.animes = parsed.animes;
      window.animeDB.collections = parsed.collections;
      if (typeof window.animeDB.sortAnimesByDate === 'function') window.animeDB.sortAnimesByDate();
      if (typeof window.animeDB.processMusicData === 'function') window.animeDB.processMusicData();

      window.loadNewReleases?.();
      window.loadFullCatalog?.();
      window.loadAnimeSection?.('anime');
      window.loadAnimeSection?.('movie');
      window.loadAnimeSection?.('ova');
      window.loadCollections?.();
      window.renderMusicGrid?.();
      if (typeof window.renderContinueWatchingGrid === 'function') {
        const list = window.animeDB.getContinueWatching?.() || [];
        window.renderContinueWatchingGrid(list, 'continue-watching-grid');
        window.renderContinueWatchingGrid(list, 'continue-grid');
      }

      window.dispatchEvent(new Event('animeDataLoaded'));
      setStatus('JSON aplicado no site com sucesso.');
    } catch (error) {
      setStatus(`Erro no JSON: ${error.message}`, true);
    }
  }

  function copyJson() {
    const textarea = byId('anime-editor-textarea');
    if (!textarea) return;
    navigator.clipboard.writeText(textarea.value || '').then(() => {
      setStatus('JSON copiado para a área de transferência.');
    }).catch(() => {
      textarea.select();
      document.execCommand('copy');
      setStatus('JSON copiado.');
    });
  }

  function downloadJson() {
    try {
      const parsed = parseEditorJson();
      const payload = JSON.stringify({ animes: parsed.animes, collections: parsed.collections }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'anime-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('Arquivo anime-data.json baixado.');
    } catch (error) {
      setStatus(`Erro ao baixar: ${error.message}`, true);
    }
  }

  function formatJson() {
    try {
      const parsed = parseEditorJson();
      const textarea = byId('anime-editor-textarea');
      textarea.value = JSON.stringify({ animes: parsed.animes, collections: parsed.collections }, null, 2);
      setStatus('JSON formatado.');
    } catch (error) {
      setStatus(`Erro ao formatar: ${error.message}`, true);
    }
  }

  function openModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadCurrentIntoEditor();
  }

  function closeModal() {
    const modal = byId('anime-editor-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function bind() {
    const openBtn = byId('open-anime-editor-btn');
    const closeBtn = byId('close-anime-editor');
    if (!openBtn) return;

    openBtn.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    byId('anime-editor-load')?.addEventListener('click', loadCurrentIntoEditor);
    byId('anime-editor-format')?.addEventListener('click', formatJson);
    byId('anime-editor-apply')?.addEventListener('click', applyToSite);
    byId('anime-editor-copy')?.addEventListener('click', copyJson);
    byId('anime-editor-download')?.addEventListener('click', downloadJson);

    window.addEventListener('click', (event) => {
      if (event.target === byId('anime-editor-modal')) closeModal();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
