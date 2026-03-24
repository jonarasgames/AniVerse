/* js/tv-mse-player.js - TV-first MSE/HLS adapter for problematic hosts (Catbox/BitChute) */
(function () {
  'use strict';

  const TV_MSE = {
    active: false,
    objectUrl: '',
    mediaSource: null,
    sourceBuffer: null,
    abortController: null,
    hls: null,
    sourceUrl: '',
    failed: false
  };

  function isTvEnv() {
    try {
      if (window.__ANIVERSE_FORCE_TV_MODE__ === true) return true;
      if (typeof window.tizen !== 'undefined' || typeof window.webapis !== 'undefined') return true;
      return /tizen|smart-tv|smarttv|hbbtv|web0s/i.test(navigator.userAgent || '');
    } catch (_) {
      return false;
    }
  }

  function isLikelyProblemHost(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const full = `${parsed.hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
      return full.includes('catbox.moe') || full.includes('bitchute.com');
    } catch (_) {
      return false;
    }
  }

  function inferMimeFromUrl(url) {
    const lower = String(url || '').split('?')[0].toLowerCase();
    if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (lower.endsWith('.mp4') || lower.endsWith('.m4v') || lower.endsWith('.mov')) return 'video/mp4';
    return '';
  }

  function canUseForUrl(url) {
    if (!isTvEnv()) return false;
    const mime = inferMimeFromUrl(url);
    if (mime === 'application/vnd.apple.mpegurl') return true;
    if (mime === 'video/mp4' && isLikelyProblemHost(url)) return true;
    return false;
  }

  function cleanup(video) {
    TV_MSE.active = false;
    TV_MSE.failed = false;
    TV_MSE.sourceUrl = '';
    try { TV_MSE.abortController?.abort(); } catch (_) {}
    TV_MSE.abortController = null;

    if (TV_MSE.hls) {
      try { TV_MSE.hls.destroy(); } catch (_) {}
      TV_MSE.hls = null;
    }

    if (TV_MSE.sourceBuffer) {
      try { TV_MSE.sourceBuffer.abort(); } catch (_) {}
      TV_MSE.sourceBuffer = null;
    }
    if (TV_MSE.mediaSource) {
      try {
        if (TV_MSE.mediaSource.readyState === 'open') TV_MSE.mediaSource.endOfStream();
      } catch (_) {}
      TV_MSE.mediaSource = null;
    }

    if (TV_MSE.objectUrl) {
      try { URL.revokeObjectURL(TV_MSE.objectUrl); } catch (_) {}
      TV_MSE.objectUrl = '';
    }

    if (video && video.dataset) {
      delete video.dataset.tvMseActive;
      delete video.dataset.tvMseSource;
    }
  }

  async function loadViaHls(video, url, resumeTime) {
    const hasHls = typeof window.Hls !== 'undefined' && window.Hls && window.Hls.isSupported && window.Hls.isSupported();

    if (hasHls) {
      const hls = new window.Hls({
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        enableWorker: true
      });
      TV_MSE.hls = hls;
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (resumeTime > 0) {
          try { video.currentTime = resumeTime; } catch (_) {}
        }
        video.play().catch(() => {});
      });
      return true;
    }

    // Native HLS fallback
    video.src = url;
    video.load();
    if (resumeTime > 0) {
      video.addEventListener('loadedmetadata', () => {
        try { video.currentTime = resumeTime; } catch (_) {}
      }, { once: true });
    }
    video.play().catch(() => {});
    return true;
  }

  async function loadViaMseMp4(video, url, resumeTime) {
    if (!('MediaSource' in window)) return false;

    const mimeCandidates = [
      'video/mp4; codecs="avc1.64001f, mp4a.40.2"',
      'video/mp4; codecs="avc1.4d401f, mp4a.40.2"',
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4'
    ];
    const mimeCodec = mimeCandidates.find((item) => MediaSource.isTypeSupported(item));
    if (!mimeCodec) return false;

    TV_MSE.abortController = new AbortController();
    TV_MSE.mediaSource = new MediaSource();
    TV_MSE.objectUrl = URL.createObjectURL(TV_MSE.mediaSource);
    video.src = TV_MSE.objectUrl;
    video.dataset.tvMseActive = '1';
    video.dataset.tvMseSource = url;

    const chunkSize = 1024 * 1024; // 1MB
    const head = await fetch(url, { method: 'HEAD', mode: 'cors', cache: 'no-store', signal: TV_MSE.abortController.signal });
    if (!head.ok) throw new Error(`HEAD ${head.status}`);
    const length = Number(head.headers.get('content-length') || '0');
    if (!length || Number.isNaN(length)) throw new Error('content-length unavailable for MSE');

    await new Promise((resolve, reject) => {
      TV_MSE.mediaSource.addEventListener('sourceopen', resolve, { once: true });
      TV_MSE.mediaSource.addEventListener('error', reject, { once: true });
    });

    TV_MSE.sourceBuffer = TV_MSE.mediaSource.addSourceBuffer(mimeCodec);

    const appendBuffer = (chunk) => new Promise((resolve, reject) => {
      const onEnd = () => {
        TV_MSE.sourceBuffer.removeEventListener('updateend', onEnd);
        TV_MSE.sourceBuffer.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = (event) => {
        TV_MSE.sourceBuffer.removeEventListener('updateend', onEnd);
        TV_MSE.sourceBuffer.removeEventListener('error', onErr);
        reject(event);
      };
      TV_MSE.sourceBuffer.addEventListener('updateend', onEnd);
      TV_MSE.sourceBuffer.addEventListener('error', onErr);
      TV_MSE.sourceBuffer.appendBuffer(chunk);
    });

    let position = 0;
    let started = false;

    while (position < length) {
      const end = Math.min(length - 1, position + chunkSize - 1);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: { Range: `bytes=${position}-${end}` },
        signal: TV_MSE.abortController.signal
      });

      if (!(response.ok || response.status === 206)) {
        throw new Error(`Chunk fetch ${response.status}`);
      }

      const chunk = await response.arrayBuffer();
      if (!chunk.byteLength) break;
      await appendBuffer(chunk);

      position = end + 1;

      if (!started && position >= Math.min(length, chunkSize * 3)) {
        started = true;
        if (resumeTime > 0) {
          try { video.currentTime = Math.max(0, resumeTime - 0.2); } catch (_) {}
        }
        video.play().catch(() => {});
      }
    }

    if (TV_MSE.mediaSource && TV_MSE.mediaSource.readyState === 'open') {
      try { TV_MSE.mediaSource.endOfStream(); } catch (_) {}
    }
    if (!started) {
      if (resumeTime > 0) {
        try { video.currentTime = Math.max(0, resumeTime - 0.2); } catch (_) {}
      }
      video.play().catch(() => {});
    }

    return true;
  }

  async function load(video, url, options = {}) {
    if (!video || !url || !canUseForUrl(url)) return false;

    cleanup(video);
    TV_MSE.active = true;
    TV_MSE.sourceUrl = url;

    const resumeTime = Number(options.resumeTime || 0);
    const mime = inferMimeFromUrl(url);
    try {
      if (mime === 'application/vnd.apple.mpegurl') {
        await loadViaHls(video, url, resumeTime);
      } else {
        await loadViaMseMp4(video, url, resumeTime);
      }
      window.__tvMseStatus = { active: true, url, at: Date.now(), mode: mime === 'application/vnd.apple.mpegurl' ? 'hls' : 'mse-mp4' };
      return true;
    } catch (error) {
      TV_MSE.failed = true;
      window.__tvMseStatus = { active: false, failed: true, url, at: Date.now(), error: String(error) };
      cleanup(video);
      return false;
    }
  }

  window.__tvMsePlayer = {
    canUseForUrl,
    load,
    cleanup,
    state: TV_MSE
  };
})();
