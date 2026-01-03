/* js/image-retry.js - Centralized image retry system to handle network failures */
(function() {
  'use strict';

  const MAX_RETRIES = 10;
  const RETRY_DELAY = 1500; // 1.5 seconds
  const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"%3E%3Crect fill="%23333" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" fill="%23999" font-family="Arial" font-size="18" text-anchor="middle" dominant-baseline="middle"%3EImagem indisponível%3C/text%3E%3C/svg%3E';

  /**
   * Setup retry logic for an image element
   * @param {HTMLImageElement} img - The image element to setup retry for
   */
  function setupImageRetry(img) {
    // Skip if already setup or if it's a data URL
    if (img.dataset.retrySetup === 'true' || img.src.startsWith('data:')) {
      return;
    }

    // Mark as setup to avoid duplicate handlers
    img.dataset.retrySetup = 'true';
    
    // Initialize retry count
    if (!img.dataset.retryCount) {
      img.dataset.retryCount = '0';
    }

    // Store original src for retry attempts
    if (!img.dataset.originalSrc) {
      img.dataset.originalSrc = img.src;
    }

    // Setup error handler
    img.onerror = function() {
      const retryCount = parseInt(img.dataset.retryCount || '0');
      const originalSrc = img.dataset.originalSrc || img.src;

      // If we've exceeded max retries, show placeholder
      if (retryCount >= MAX_RETRIES) {
        console.warn(`Image failed to load after ${MAX_RETRIES} attempts:`, originalSrc);
        img.src = PLACEHOLDER_IMAGE;
        img.alt = 'Imagem indisponível';
        return;
      }

      // Increment retry count
      img.dataset.retryCount = String(retryCount + 1);

      // Log retry attempt
      console.log(`Retrying image (attempt ${retryCount + 1}/${MAX_RETRIES}):`, originalSrc);

      // Wait before retrying
      setTimeout(() => {
        // Add cache-busting timestamp to force reload
        const separator = originalSrc.includes('?') ? '&' : '?';
        const timestamp = new Date().getTime();
        img.src = `${originalSrc}${separator}_retry=${timestamp}`;
      }, RETRY_DELAY);
    };

    // Reset retry count on successful load
    img.onload = function() {
      if (img.dataset.retryCount && parseInt(img.dataset.retryCount) > 0) {
        console.log(`Image loaded successfully after ${img.dataset.retryCount} retries:`, img.dataset.originalSrc);
      }
      img.dataset.retryCount = '0';
    };
  }

  /**
   * Setup retry for all existing images on the page
   */
  function setupAllImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      setupImageRetry(img);
    });
  }

  /**
   * Observe DOM for new images and setup retry for them
   */
  function observeNewImages() {
    // Create a MutationObserver to watch for new images
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If the node itself is an image
            if (node.tagName === 'IMG') {
              setupImageRetry(node);
            }
            // If the node contains images
            if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              images.forEach(img => setupImageRetry(img));
            }
          }
        });
      });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Initialize the image retry system
   */
  function init() {
    // Setup retry for images that are already in the DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAllImages);
    } else {
      setupAllImages();
    }

    // Observe for new images added dynamically
    observeNewImages();

    console.log('✅ Image retry system initialized');
  }

  // Export functions to window for manual use if needed
  window.imageRetry = {
    setup: setupImageRetry,
    setupAll: setupAllImages,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY
  };

  // Initialize on script load
  init();
})();
