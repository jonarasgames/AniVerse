(function () {
  'use strict';

  const CLIPS_META_KEY = 'aniVerseClipsMeta';
  const MAX_CLIP_MS = 60000;

  let clipRecorder = null;
  let activeRecordStream = null;
  let recordedChunks = [];
  let recordingStart = 0;
  let autoStopTimer = null;
  let runtimeClipUrls = new Map();

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
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

  function setRecordButtonState(recording) {
    const btn = document.getElementById('clip-record-btn');
    if (!btn) return;
    btn.classList.toggle('recording', recording);
    btn.title = recording ? 'Parar gravação de clipe' : 'Iniciar gravação de clipe';
    btn.innerHTML = recording ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-circle"></i>';
  }

  function stopActiveStream() {
    if (!activeRecordStream) return;
    activeRecordStream.getTracks().forEach((track) => {
      try { track.stop(); } catch (_) {}
    });
    activeRecordStream = null;
  }

  function stopRecording() {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;

    if (clipRecorder && clipRecorder.state !== 'inactive') {
      try { clipRecorder.stop(); } catch (_) {}
    }
  }

  function normalizeStream(stream) {
    if (!stream) return null;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const tracks = [videoTrack];
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) tracks.push(audioTrack);

    return new MediaStream(tracks);
  }

  function resolveMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';

    const candidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function getPlayerStream(player) {
    if (!player) return null;

    try {
      if (typeof player.captureStream === 'function') return normalizeStream(player.captureStream());
      if (typeof player.mozCaptureStream === 'function') return normalizeStream(player.mozCaptureStream());
    } catch (error) {
      console.warn('Falha ao capturar stream direto do player:', error);
    }

    return null;
  }

  async function getDisplayStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return null;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
        preferCurrentTab: true
      });
      const normalized = normalizeStream(stream);
      if (normalized) return normalized;
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn('Falha getDisplayMedia (video+audio):', error);
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true
      });
      const normalized = normalizeStream(stream);
      if (normalized) return normalized;
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn('Falha getDisplayMedia (somente video):', error);
    }

    return null;
  }

  async function acquireRecordStream(player) {
    const directStream = getPlayerStream(player);
    if (directStream) return directStream;

    return getDisplayStream();
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
    const clip = getStoredClips().find((item) => item.id === clipId);
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
    saveStoredClips(getStoredClips().filter((item) => item.id !== clipId));
    if (runtimeClipUrls.has(clipId)) {
      URL.revokeObjectURL(runtimeClipUrls.get(clipId));
      runtimeClipUrls.delete(clipId);
    }
    renderClips();
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
          <small>${new Date(clip.createdAt || Date.now()).toLocaleString('pt-BR')} • ${formatDuration(clip.duration)}</small>
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

  async function startRecording() {
    const player = document.getElementById('anime-player');
    if (!player) {
      alert('Player de vídeo não encontrado para gravar o clipe.');
      return;
    }

    if (!window.MediaRecorder) {
      alert('Seu navegador não suporta gravação de clipes.');
      return;
    }

    if (!player.currentSrc) {
      alert('Abra um episódio e dê play antes de gravar o clipe.');
      return;
    }

    const stream = await acquireRecordStream(player);
    if (!stream) {
      alert('Não foi possível iniciar a gravação de clipe. Permita captura da aba/tela quando solicitado.');
      return;
    }

    const mimeType = resolveMimeType();

    try {
      clipRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (errorWithMime) {
      try {
        clipRecorder = new MediaRecorder(stream);
      } catch (error) {
        console.warn('Falha ao criar MediaRecorder:', errorWithMime, error);
        stream.getTracks().forEach((track) => track.stop());
        alert('Não foi possível iniciar a gravação de clipe neste navegador.');
        return;
      }
    }

    activeRecordStream = stream;
    recordedChunks = [];
    recordingStart = Date.now();

    clipRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data);
    });

    clipRecorder.addEventListener('error', () => {
      setRecordButtonState(false);
      stopActiveStream();
      clipRecorder = null;
      recordedChunks = [];
      alert('A gravação falhou durante o processo. Tente novamente.');
    }, { once: true });

    clipRecorder.addEventListener('stop', () => {
      setRecordButtonState(false);
      stopActiveStream();

      const duration = (Date.now() - recordingStart) / 1000;
      if (!recordedChunks.length) {
        clipRecorder = null;
        return;
      }

      const outputType = clipRecorder && clipRecorder.mimeType ? clipRecorder.mimeType : 'video/webm';
      const blob = new Blob(recordedChunks, { type: outputType });
      const clip = registerClip(blob, duration);

      clipRecorder = null;
      recordedChunks = [];
      alert(`Clipe gravado! Vá na aba "Clipes" para baixar. (${clip.title})`);
    }, { once: true });

    clipRecorder.start(1000);
    setRecordButtonState(true);
    autoStopTimer = setTimeout(stopRecording, MAX_CLIP_MS);
  }

  function setupEvents() {
    const recordBtn = document.getElementById('clip-record-btn');
    const clipsGrid = document.getElementById('clips-grid');
    const clearBtn = document.getElementById('clear-clips-btn');
    const closeVideoBtn = document.getElementById('close-video');

    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        if (clipRecorder && clipRecorder.state !== 'inactive') {
          stopRecording();
          return;
        }

        startRecording().catch((error) => {
          console.error('Falha inesperada ao iniciar clipagem:', error);
          setRecordButtonState(false);
          stopActiveStream();
          clipRecorder = null;
          alert('Não foi possível iniciar a clipagem agora.');
        });
      });
    }

    if (clipsGrid) {
      clipsGrid.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;

        const clipId = btn.dataset.id;
        if (btn.dataset.action === 'download') downloadClip(clipId);
        if (btn.dataset.action === 'remove') removeClip(clipId);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        saveStoredClips([]);
        runtimeClipUrls.forEach((url) => URL.revokeObjectURL(url));
        runtimeClipUrls = new Map();
        renderClips();
      });
    }

    if (closeVideoBtn) {
      closeVideoBtn.addEventListener('click', () => {
        if (clipRecorder && clipRecorder.state !== 'inactive') stopRecording();
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
