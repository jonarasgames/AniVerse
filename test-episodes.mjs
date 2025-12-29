import { chromium } from 'playwright';

async function testEpisodeSelectors() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    try {
        console.log('1. Loading homepage and creating profile...');
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(3000);
        
        // Create a profile if modal is open
        const modalVisible = await page.locator('#profile-modal').evaluate(el => {
            return el.style.display === 'flex' || el.classList.contains('active');
        });
        
        if (modalVisible) {
            await page.fill('#profile-name', 'EpisodeTester');
            await page.click('#save-profile-btn');
            await page.waitForTimeout(2000);
        }
        
        await page.screenshot({ path: '/tmp/ep-01-homepage.png' });
        console.log('  ✓ Homepage ready');
        
        console.log('\n2. Opening first anime...');
        const firstAnime = await page.locator('.anime-card').first();
        const firstName = await firstAnime.locator('.anime-title').textContent();
        console.log(`  - Opening: ${firstName}`);
        await firstAnime.click();
        await page.waitForTimeout(2000);
        
        // Check season/episode selectors
        const season1Count = await page.locator('#season-select option').count();
        const episode1Count = await page.locator('#episode-select option').count();
        console.log(`  - Seasons: ${season1Count}, Episodes: ${episode1Count}`);
        
        const season1Text = await page.locator('#season-select option').first().textContent();
        const episode1Text = await page.locator('#episode-select option').first().textContent();
        console.log(`  - First season: ${season1Text}, First episode: ${episode1Text}`);
        
        await page.screenshot({ path: '/tmp/ep-02-first-anime.png' });
        
        console.log('\n3. Closing modal and opening second anime...');
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        const secondAnime = await page.locator('.anime-card').nth(1);
        const secondName = await secondAnime.locator('.anime-title').textContent();
        console.log(`  - Opening: ${secondName}`);
        await secondAnime.click();
        await page.waitForTimeout(2000);
        
        // Check season/episode selectors for second anime
        const season2Count = await page.locator('#season-select option').count();
        const episode2Count = await page.locator('#episode-select option').count();
        console.log(`  - Seasons: ${season2Count}, Episodes: ${episode2Count}`);
        
        const season2Text = await page.locator('#season-select option').first().textContent();
        const episode2Text = await page.locator('#episode-select option').first().textContent();
        console.log(`  - First season: ${season2Text}, First episode: ${episode2Text}`);
        
        await page.screenshot({ path: '/tmp/ep-03-second-anime.png' });
        
        // Verify selectors changed
        if (season1Count === season2Count && episode1Count === episode2Count) {
            console.log('\n⚠️  WARNING: Selectors might not have updated!');
            console.log(`   First anime: ${season1Count} seasons, ${episode1Count} episodes`);
            console.log(`   Second anime: ${season2Count} seasons, ${episode2Count} episodes`);
        } else {
            console.log('\n✅ Selectors updated correctly between animes!');
        }
        
        console.log('\n4. Testing season/episode selection...');
        
        // If there are multiple seasons, test switching
        if (season2Count > 1) {
            console.log('  - Switching to season 2...');
            await page.selectOption('#season-select', '2');
            await page.waitForTimeout(1500);
            const newEpisodeCount = await page.locator('#episode-select option').count();
            console.log(`  - Season 2 episodes: ${newEpisodeCount}`);
            await page.screenshot({ path: '/tmp/ep-04-season-2.png' });
        }
        
        // If there are multiple episodes, test switching
        if (episode2Count > 1) {
            console.log('  - Switching to episode 2...');
            await page.selectOption('#episode-select', '1');  // Index 1 = Episode 2
            await page.waitForTimeout(1500);
            const currentEpisodeLabel = await page.locator('#current-episode-label').textContent();
            console.log(`  - Current episode label: ${currentEpisodeLabel}`);
            await page.screenshot({ path: '/tmp/ep-05-episode-2.png' });
        }
        
        console.log('\n5. Going back to first anime to verify selectors reload...');
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        await page.locator('.anime-card').first().click();
        await page.waitForTimeout(2000);
        
        const season3Count = await page.locator('#season-select option').count();
        const episode3Count = await page.locator('#episode-select option').count();
        console.log(`  - Back to first anime - Seasons: ${season3Count}, Episodes: ${episode3Count}`);
        
        if (season3Count === season1Count && episode3Count === episode1Count) {
            console.log('  ✅ First anime selectors reloaded correctly!');
        } else {
            console.log('  ⚠️  WARNING: First anime selectors may not have reloaded correctly!');
        }
        
        await page.screenshot({ path: '/tmp/ep-06-back-to-first.png' });
        
        console.log('\n✅ Episode selector tests completed!');
        console.log('\nScreenshots saved in /tmp/');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await page.screenshot({ path: '/tmp/ep-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testEpisodeSelectors();
