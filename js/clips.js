(function () {
  'use strict';

  const CLIPS_META_KEY = 'aniVerseClipsMeta';
  let clipRecorder = null;
  let recordedChunks = [];
  let recordingStart = 0;
  let autoStopTimer = null;
  let runtimeClipUrls = new Map();

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  function getStoredClips() {
    return safeParse(localStorage.getItem(CLIPS_META_KEY), []);
  }

  function saveStoredClips(clips) {
    localStorage.setItem(CLIPS_META_KEY, JSON.stringify(clips));
  }

  function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${rest.toString().padStart(2, '0')}`;
  }

  function escapeHtml(text) {
    return (text || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function renderClips() {
    const grid = document.getElementById('clips-grid');
    if (!grid) return;

    const clips = getStoredClips();
    grid.innerHTML = '';

    if (!clips.length) {
      grid.innerHTML = '<p class="clips-empty">Nenhum clipe gravado ainda. Abra um anime, use o botão vermelho no player e volte aqui.</p>';
      return;
    }

    clips.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach((clip) => {
      const hasBlob = runtimeClipUrls.has(clip.id);
      const card = document.createElement('article');
      card.className = 'clip-card';
      card.innerHTML = `
        <img src="${escapeHtml(clip.thumbnail || 'images/bg-default.jpg')}" alt="${escapeHtml(clip.title)}" class="clip-thumb">
        <div class="clip-info">
          <h3>${escapeHtml(clip.title || 'Clipe')}</h3>
          <p>${escapeHtml(clip.subtitle || '')}</p>
          <small>${new Date(clip.createdAt || Date.now()).toLocaleString('pt-BR')} • ${formatDuration(clip.duration)} </small>
        </div>
        <div class="clip-actions">
          <button class="btn btn-primary" data-action="download" data-id="${clip.id}" ${hasBlob ? '' : 'disabled'}>
            <i class="fas fa-download"></i> Baixar
          </button>
          <button class="btn btn-secondary" data-action="remove" data-id="${clip.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function registerClip(blob, duration) {
    const current = window.currentWatchingAnime || {};
    const anime = window.currentAnime || {};
    const clipId = `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const blobUrl = URL.createObjectURL(blob);
    runtimeClipUrls.set(clipId, blobUrl);

    const clip = {
      id: clipId,
      title: current.title || anime.title || 'Clipe AniVerse',
      subtitle: `${current.seasonName || `Temporada ${current.season || 1}`} • Episódio ${current.episode || 1}`,
      thumbnail: current.thumbnail || anime.cover || anime.thumbnail || 'images/bg-default.jpg',
      duration,
      createdAt: Date.now(),
      filename: `${(current.title || 'anime').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.webm`
    };

    const clips = getStoredClips();
    clips.push(clip);
    saveStoredClips(clips);
    renderClips();
    return clip;
  }

  function downloadClip(clipId) {
    const clips = getStoredClips();
    const clip = clips.find((item) => item.id === clipId);
    const url = runtimeClipUrls.get(clipId);
    if (!clip || !url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = clip.filename || `${clipId}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function removeClip(clipId) {
    const clips = getStoredClips().filter((item) => item.id !== clipId);
    saveStoredClips(clips);
    if (runtimeClipUrls.has(clipId)) {
      URL.revokeObjectURL(runtimeClipUrls.get(clipId));
      runtimeClipUrls.delete(clipId);
    }
    renderClips();
  }

  function setRecordButtonState(recording) {
    const btn = document.getElementById('clip-record-btn');
    if (!btn) return;
    btn.classList.toggle('recording', recording);
    btn.title = recording ? 'Parar gravação de clipe' : 'Iniciar gravação de clipe';
    btn.innerHTML = recording ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-circle"></i>';
  }

  function stopRecording() {
    if (!clipRecorder) return;
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
    try { clipRecorder.stop(); } catch (e) {}
  }

  async function getFallbackDisplayStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return null;
    }

    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: true
      });
    } catch (error) {
      console.warn('Usuário negou/fechou captura de tela para clipe:', error);
      return null;
    }
  }

  function resolveMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';

    const preferredTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4'
    ];

    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function getPlayerStream(player) {
    if (!player) return null;
    if (typeof player.captureStream === 'function') return player.captureStream();
    if (typeof player.mozCaptureStream === 'function') return player.mozCaptureStream();
    return null;
  }

  async function startRecording() {
    const player = document.getElementById('anime-player');
    if (!player) {
      alert('Player de vídeo não encontrado para gravar o clipe.');
      return;
    }

    if (!window.MediaRecorder) {
      alert('Seu navegador ainda não suporta gravação de clipes. Tente Chrome/Edge atualizado.');
      return;
    }

    if (!player.currentSrc) {
      alert('Abra um episódio e dê play antes de gravar o clipe.');
      return;
    }

    let stream = null;
    try {
      stream = getPlayerStream(player);
    } catch (e) {
      console.warn('Erro ao capturar stream do player:', e);
    }

    if (!stream) {
      stream = await getFallbackDisplayStream();
      if (!stream) {
        alert('Não foi possível clipar automaticamente. Permita capturar a aba atual quando o navegador solicitar.');
        return;
      }
    }

    const mimeType = resolveMimeType();

    try {
      clipRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      try {
        clipRecorder = new MediaRecorder(stream);
      } catch (fallbackError) {
        console.warn('Erro ao criar MediaRecorder:', e, fallbackError);
        alert('Não foi possível iniciar a gravação de clipe neste navegador/formato.');
        return;
      }
    }

    recordedChunks = [];
    recordingStart = Date.now();

    clipRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data);
    });

    clipRecorder.addEventListener('error', () => {
      setRecordButtonState(false);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      clipRecorder = null;
      recordedChunks = [];
      alert('A gravação falhou durante o processo. Tente novamente.');
    }, { once: true });

    clipRecorder.addEventListener('stop', () => {
      setRecordButtonState(false);
      const duration = (Date.now() - recordingStart) / 1000;

      if (stream) stream.getTracks().forEach((track) => track.stop());

      if (!recordedChunks.length) {
        clipRecorder = null;
        return;
      }

      const outputType = (clipRecorder && clipRecorder.mimeType) ? clipRecorder.mimeType : 'video/webm';
      const blob = new Blob(recordedChunks, { type: outputType });
      const clip = registerClip(blob, duration);
      clipRecorder = null;
      recordedChunks = [];
      alert(`Clipe gravado! Vá na aba "Clipes" para baixar. (${clip.title})`);
    }, { once: true });

    clipRecorder.start(1000);
    setRecordButtonState(true);
    autoStopTimer = setTimeout(stopRecording, 60000);
  }

  function setupEvents() {
    const clipsGrid = document.getElementById('clips-grid');
    const clearBtn = document.getElementById('clear-clips-btn');
    const recordBtn = document.getElementById('clip-record-btn');

    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        if (clipRecorder && clipRecorder.state !== 'inactive') {
          stopRecording();
        } else {
          startRecording().catch((error) => {
            console.error('Falha ao iniciar gravação de clipe:', error);
            setRecordButtonState(false);
            alert('Não foi possível iniciar a clipagem agora. Tente novamente.');
          });
        }
      });
    }

    if (clipsGrid) {
      clipsGrid.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === 'download') {
          downloadClip(id);
        } else if (btn.dataset.action === 'remove') {
          removeClip(id);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        saveStoredClips([]);
        runtimeClipUrls.forEach((value) => URL.revokeObjectURL(value));
        runtimeClipUrls = new Map();
        renderClips();
      });
    }

    const closeVideoBtn = document.getElementById('close-video');
    if (closeVideoBtn) {
      closeVideoBtn.addEventListener('click', () => {
        if (clipRecorder && clipRecorder.state !== 'inactive') {
          stopRecording();
        }
      });
    }
  }

  function init() {
    setupEvents();
    renderClips();
    window.renderClips = renderClips;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
