const { test, expect } = require('@playwright/test');

test.describe('Age Rating Badge Visibility', () => {
  test('should hide age rating badge by default and show on hover', async ({ page }) => {
    // Navigate to the site
    await page.goto('https://jonarasgames.github.io/AniVerse/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for anime data to load
    await page.waitForResponse(
      resp => resp.url().includes('anime-data.json'),
      { timeout: 10000 }
    ).catch(() => null);
    
    // Wait for anime cards to be rendered
    const animeCard = page.locator('.anime-card').first();
    await animeCard.waitFor({ state: 'visible', timeout: 10000 });
    
    const ageRatingBadge = animeCard.locator('.age-rating-badge');
    
    // Check if badge exists
    const badgeCount = await ageRatingBadge.count();
    
    if (badgeCount > 0) {
      // Badge should be hidden by default (opacity: 0)
      const opacityBeforeHover = await ageRatingBadge.evaluate(el => {
        return window.getComputedStyle(el).opacity;
      });
      
      console.log('Badge opacity before hover:', opacityBeforeHover);
      expect(parseFloat(opacityBeforeHover)).toBe(0);
      
      // Hover over the card
      await animeCard.hover();
      await page.waitForTimeout(500); // Wait for transition
      
      // Badge should be visible on hover (opacity: 1)
      const opacityOnHover = await ageRatingBadge.evaluate(el => {
        return window.getComputedStyle(el).opacity;
      });
      
      console.log('Badge opacity on hover:', opacityOnHover);
      expect(parseFloat(opacityOnHover)).toBe(1);
      
      // Check badge positioning (bottom-right corner)
      const badgePosition = await ageRatingBadge.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          bottom: styles.bottom,
          right: styles.right,
          zIndex: styles.zIndex
        };
      });
      
      console.log('Badge position:', badgePosition);
      expect(badgePosition.position).toBe('absolute');
      expect(badgePosition.bottom).toBe('8px');
      expect(badgePosition.right).toBe('8px');
      expect(parseInt(badgePosition.zIndex)).toBe(10);
      
      // Check badge is inside trailer-overlay
      const badgeParent = await ageRatingBadge.evaluate(el => {
        return el.parentElement.className;
      });
      
      console.log('Badge parent class:', badgeParent);
      expect(badgeParent).toContain('trailer-overlay');
    } else {
      console.log('No age rating badge found on first card - skipping test');
    }
  });
  
  test('should have correct badge size on desktop and mobile', async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://jonarasgames.github.io/AniVerse/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for anime cards to be rendered
    const animeCard = page.locator('.anime-card').first();
    await animeCard.waitFor({ state: 'visible', timeout: 10000 });
    const ageRatingBadge = animeCard.locator('.age-rating-badge');
    
    const badgeCount = await ageRatingBadge.count();
    
    if (badgeCount > 0) {
      // Check desktop size (32x32)
      const desktopSize = await ageRatingBadge.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height
        };
      });
      
      console.log('Desktop badge size:', desktopSize);
      expect(desktopSize.width).toBe('32px');
      expect(desktopSize.height).toBe('32px');
      
      // Test mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      // Wait for styles to be recalculated after viewport change
      await page.waitForFunction(() => {
        const badge = document.querySelector('.age-rating-badge');
        return badge && window.getComputedStyle(badge).width === '28px';
      }, { timeout: 5000 }).catch(() => {
        // Fallback if width doesn't update, badge might not exist
      });
      
      const mobileSize = await ageRatingBadge.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height
        };
      });
      
      console.log('Mobile badge size:', mobileSize);
      expect(mobileSize.width).toBe('28px');
      expect(mobileSize.height).toBe('28px');
    } else {
      console.log('No age rating badge found - skipping size test');
    }
  });
});
