// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Image Retry System', () => {
  test('should have image retry system loaded', async ({ page }) => {
    await page.goto('/');
    
    // Check if the image retry system is loaded
    const imageRetryExists = await page.evaluate(() => {
      return typeof window.imageRetry !== 'undefined';
    });
    
    expect(imageRetryExists).toBe(true);
  });

  test('should setup retry for existing images', async ({ page }) => {
    await page.goto('/');
    
    // Wait for images to load
    await page.waitForTimeout(2000);
    
    // Check if images have retry setup
    const imagesWithRetry = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let setupCount = 0;
      images.forEach(img => {
        if (img.dataset.retrySetup === 'true') {
          setupCount++;
        }
      });
      return {
        total: images.length,
        withRetry: setupCount
      };
    });
    
    // Most images should have retry setup (allow some that might be data URLs)
    expect(imagesWithRetry.withRetry).toBeGreaterThan(0);
  });

  test('should handle broken image with retry', async ({ page }) => {
    await page.goto('/');
    
    // Inject a broken image and track retries
    const retryAttempts = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.src = 'https://invalid-url-that-will-fail.test/image.jpg';
        img.alt = 'Test broken image';
        document.body.appendChild(img);
        
        let attempts = 0;
        const originalOnerror = img.onerror;
        
        img.onerror = function() {
          attempts++;
          if (originalOnerror) {
            originalOnerror.call(this);
          }
        };
        
        // Wait for retries to complete (10 retries * 1.5s delay + buffer)
        setTimeout(() => {
          resolve({
            attempts,
            finalSrc: img.src,
            retryCount: img.dataset.retryCount
          });
        }, 20000); // 20 seconds to allow all retries
      });
    });
    
    // Should have attempted retries
    expect(parseInt(retryAttempts.retryCount)).toBeGreaterThan(0);
  });

  test('should setup retry for dynamically added images', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForTimeout(1000);
    
    // Add a new image dynamically
    const hasRetrySetup = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.src = 'images/logo.png';
        img.alt = 'Test dynamic image';
        document.body.appendChild(img);
        
        // Wait a bit for MutationObserver to kick in
        setTimeout(() => {
          resolve(img.dataset.retrySetup === 'true');
        }, 500);
      });
    });
    
    expect(hasRetrySetup).toBe(true);
  });

  test('should not setup retry for data URLs', async ({ page }) => {
    await page.goto('/');
    
    const dataUrlRetrySetup = await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      document.body.appendChild(img);
      
      // Try to manually setup retry
      if (window.imageRetry && window.imageRetry.setup) {
        window.imageRetry.setup(img);
      }
      
      return img.dataset.retrySetup === 'true';
    });
    
    // Data URLs should not have retry setup
    expect(dataUrlRetrySetup).toBe(false);
  });

  test('should initialize retry count to 0', async ({ page }) => {
    await page.goto('/');
    
    // Wait for images to be setup
    await page.waitForTimeout(1000);
    
    const initialRetryCount = await page.evaluate(() => {
      const images = document.querySelectorAll('img[data-retry-setup="true"]');
      if (images.length === 0) return null;
      return images[0].dataset.retryCount;
    });
    
    // Initial retry count should be 0 or undefined (which gets set to 0)
    expect(initialRetryCount === '0' || initialRetryCount === undefined).toBe(true);
  });
});
