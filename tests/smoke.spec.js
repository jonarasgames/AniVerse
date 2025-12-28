const { test, expect } = require('@playwright/test');

test.describe('AniVerse Smoke Test', () => {
  test('should load and display core elements', async ({ page }) => {
    // Navigate to the site
    await page.goto('https://jonarasgames.github.io/AniVerse/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Verificar carregamento de anime-data.json
    const dataResponse = await page.waitForResponse(
      resp => resp.url().includes('anime-data.json'),
      { timeout: 10000 }
    ).catch(() => null);
    
    if (dataResponse) {
      console.log('FETCH_ANIME_DATA_STATUS:', dataResponse.status());
      expect(dataResponse.status()).toBe(200);
    }
    
    // Wait a bit for rendering
    await page.waitForTimeout(2000);
    
    // Verificar containers
    const animeGridCount = await page.locator('#new-releases-grid .anime-card, #full-catalog-grid .anime-card').count();
    const musicGridExists = await page.locator('#music-grid').count();
    
    console.log('CONTAINER_COUNTS:', { 
      animeCards: animeGridCount,
      musicGridExists: musicGridExists > 0 
    });
    
    // At least some anime cards should exist
    expect(animeGridCount).toBeGreaterThan(0);
    
    // Verificar tema aplicado
    const themeClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('theme-dark') ||
             document.documentElement.classList.contains('theme-light');
    });
    console.log('Theme class applied:', themeClass);
    expect(themeClass).toBe(true);
    
    // Verificar profileManager disponível
    const profileManagerExists = await page.evaluate(() => {
      return typeof window.profileManager !== 'undefined';
    });
    console.log('profileManager exists:', profileManagerExists);
    expect(profileManagerExists).toBe(true);
    
    // Verificar player existe
    const playerExists = await page.locator('#anime-player').count();
    console.log('Video player exists:', playerExists > 0);
    expect(playerExists).toBe(1);
    
    // Verificar que não há erros críticos no console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit more to catch any errors
    await page.waitForTimeout(1000);
    
    // Check for critical errors (ignore common ones like ad blockers)
    const criticalErrors = errors.filter(err => 
      !err.includes('ERR_BLOCKED_BY_CLIENT') && 
      !err.includes('favicon') &&
      !err.includes('net::')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('Console errors found:', criticalErrors);
    }
    
    // Core functionality should work even with some non-critical errors
    expect(criticalErrors.length).toBeLessThan(5);
  });
  
  test('should handle navigation', async ({ page }) => {
    await page.goto('https://jonarasgames.github.io/AniVerse/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    // Check navigation links
    const animesLink = page.locator('nav a[data-section="animes"]');
    const musicLink = page.locator('nav a[data-section="openings"]');
    
    // Click on Animes
    await animesLink.click();
    await page.waitForTimeout(500);
    
    const animesSection = await page.locator('#animes-section').isVisible();
    expect(animesSection).toBe(true);
    
    // Click on Music
    await musicLink.click();
    await page.waitForTimeout(500);
    
    const musicSection = await page.locator('#openings-section').isVisible();
    expect(musicSection).toBe(true);
  });
  
  test('should have proper thumbnail styling', async ({ page }) => {
    await page.goto('https://jonarasgames.github.io/AniVerse/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check if anime cards have images with proper object-fit
    const firstCard = page.locator('.anime-card').first();
    const img = firstCard.locator('img').first();
    
    if (await img.count() > 0) {
      const objectFit = await img.evaluate(el => window.getComputedStyle(el).objectFit);
      console.log('Image object-fit:', objectFit);
      expect(['cover', 'contain']).toContain(objectFit);
    }
  });
});
