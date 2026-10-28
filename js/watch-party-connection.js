/* Bounded connection wait: cold starts can retry without repeating room commands. */
(function(root) {
  'use strict';
  function waitForPartyConnection(socket, options = {}) {
    const { signal, timeoutMs = 90000, onProgress = () => {} } = options;
    if (socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const started = Date.now(); let attempts = 0, settled = false;
      let timeout, ticker;
      function cleanup() {
        clearTimeout(timeout); clearInterval(ticker);
        socket.off('connect', connected); socket.off('connect_error', failedAttempt);
        signal?.removeEventListener('abort', cancelled);
      }
      function finish(error) {
        if (settled) return; settled = true; cleanup();
        if (error) { socket.disconnect(); reject(error); } else resolve();
      }
      function connected() { finish(); }
      function progress() { if (!settled) onProgress({ elapsedSeconds: Math.floor((Date.now() - started) / 1000), attempts }); }
      function failedAttempt() { attempts++; progress(); }
      function cancelled() { const error = new Error('Conexão cancelada. Você pode tentar novamente quando quiser.'); error.code = 'CONNECTION_CANCELLED'; error.silent = signal?.reason === 'silent'; finish(error); }
      socket.on('connect', connected); socket.on('connect_error', failedAttempt);
      signal?.addEventListener('abort', cancelled, { once: true });
      if (signal?.aborted) { cancelled(); return; }
      timeout = setTimeout(() => { const error = new Error('O servidor não respondeu a tempo. Tente novamente em alguns instantes.'); error.code = 'CONNECTION_TIMEOUT'; finish(error); }, timeoutMs);
      ticker = setInterval(progress, 1000); progress();
      try { socket.connect(); } catch (error) { finish(error); }
    });
  }
  async function warmPartyServer(endpoint, options = {}) {
    const { signal, timeoutMs = 90000, fetchFn = root.fetch.bind(root) } = options;
    let url;
    try { url = new URL('/health',endpoint); if (!['https:','http:'].includes(url.protocol)) return false; } catch (_) { return false; }
    if (signal?.aborted) return false;
    const controller = new AbortController(), cancel = () => controller.abort();
    signal?.addEventListener('abort',cancel,{once:true});
    const timeout = setTimeout(cancel,timeoutMs);
    try {
      // A single public request wakes the service. An opaque response is not proof of readiness.
      await fetchFn(url.href,{mode:'no-cors',credentials:'omit',cache:'no-store',signal:controller.signal});
      return true;
    } catch (_) { return false; }
    finally { clearTimeout(timeout); signal?.removeEventListener('abort',cancel); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { waitForPartyConnection, warmPartyServer };
  else { root.waitForPartyConnection = waitForPartyConnection; root.warmPartyServer = warmPartyServer; }
})(typeof window !== 'undefined' ? window : globalThis);
