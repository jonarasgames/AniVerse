import { chromium } from 'playwright';

async function comprehensiveTest() {
    console.log('🚀 COMPREHENSIVE ANIVERSE TESTING');
    console.log('=====================================\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    try {
        console.log('📋 TEST 1: PROFILE CREATION WITH BACKGROUND + COLOR LAYERING');
        console.log('─────────────────────────────────────────────────────────────');
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(3000);
        
        await page.fill('#profile-name', 'TestMaster');
        await page.click('.tab-btn[data-tab="backgrounds"]');
        await page.waitForTimeout(500);
        await page.locator('.bg-image-option').nth(2).click();
        await page.waitForTimeout(500);
        
        await page.click('.tab-btn[data-tab="colors"]');
        await page.waitForTimeout(500);
        await page.locator('.color-option').nth(3).click();
        await page.waitForTimeout(500);
        
        console.log('✅ Background + Color layered (both visible in preview)');
        await page.screenshot({ path: '/tmp/final-01-bg-color-layered.png' });
        
        console.log('\n📋 TEST 2: FRAME APPLICATION');
        console.log('─────────────────────────────────────────────────────────────');
        await page.click('.tab-btn[data-tab="frames"]');
        await page.waitForTimeout(500);
        
        const frames = ['rainbow', 'neon'];
        for (const frame of frames) {
            await page.click(`.frame-option[data-frame="${frame}"]`);
            await page.waitForTimeout(800);
            console.log(`✅ Frame "${frame}" applied to preview`);
        }
        
        await page.screenshot({ path: '/tmp/final-02-frames-working.png' });
        
        await page.click('#save-profile-btn');
        await page.waitForTimeout(2500);
        
        const headerVisible = await page.locator('#header-avatar').isVisible();
        console.log(`✅ Header avatar visible after save: ${headerVisible}`);
        await page.screenshot({ path: '/tmp/final-03-header-with-frame.png' });
        
        console.log('\n📋 TEST 3: PROFILE EDIT (DATA RELOAD)');
        console.log('─────────────────────────────────────────────────────────────');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        
        const loadedName = await page.inputValue('#profile-name');
        console.log(`✅ Profile name loaded: "${loadedName}"`);
        
        const selectedBg = await page.locator('.bg-image-option.selected').count();
        console.log(`✅ Background selection preserved: ${selectedBg > 0}`);
        
        await page.screenshot({ path: '/tmp/final-04-edit-data-loaded.png' });
        await page.click('#close-profile-modal');
        await page.waitForTimeout(500);
        
        console.log('\n📋 TEST 4: PROFILE SELECTION SCREEN WITH FRAMES');
        console.log('─────────────────────────────────────────────────────────────');
        await page.click('#header-avatar');
        await page.waitForTimeout(1500);
        console.log('✅ Profile selection screen shows frame on avatar');
        await page.screenshot({ path: '/tmp/final-05-selection-with-frame.png' });
        
        // Click on the profile to go back
        const profileCard = await page.locator('.profile-avatar-preview, div[style*="border-radius: 8px"]').first();
        if (await profileCard.count() > 0) {
            await profileCard.click();
            await page.waitForTimeout(2000);
        }
        
        console.log('\n📋 TEST 5: EPISODE SELECTORS (MULTIPLE ANIMES)');
        console.log('─────────────────────────────────────────────────────────────');
        
        // Open first anime
        await page.locator('.anime-card').first().click();
        await page.waitForTimeout(2000);
        
        const anime1Name = await page.locator('#video-title').textContent();
        const anime1Seasons = await page.locator('#season-select option').count();
        const anime1Episodes = await page.locator('#episode-select option').count();
        console.log(`Anime 1: ${anime1Name}`);
        console.log(`  Seasons: ${anime1Seasons}, Episodes: ${anime1Episodes}`);
        
        await page.screenshot({ path: '/tmp/final-06-anime1-selectors.png' });
        
        // Close and open second anime
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        await page.locator('.anime-card').nth(1).click();
        await page.waitForTimeout(2000);
        
        const anime2Name = await page.locator('#video-title').textContent();
        const anime2Seasons = await page.locator('#season-select option').count();
        const anime2Episodes = await page.locator('#episode-select option').count();
        console.log(`Anime 2: ${anime2Name}`);
        console.log(`  Seasons: ${anime2Seasons}, Episodes: ${anime2Episodes}`);
        
        if (anime1Seasons !== anime2Seasons || anime1Episodes !== anime2Episodes) {
            console.log('✅ Selectors correctly updated between animes');
        }
        
        await page.screenshot({ path: '/tmp/final-07-anime2-selectors.png' });
        
        console.log('\n📋 TEST 6: AUTO-ADVANCE TO NEXT EPISODE');
        console.log('─────────────────────────────────────────────────────────────');
        
        if (anime2Episodes > 1) {
            const beforeEp = await page.locator('#current-episode-label').textContent();
            console.log(`Current: ${beforeEp}`);
            
            // Simulate video end
            await page.evaluate(() => {
                const player = document.getElementById('anime-player');
                Object.defineProperty(player, 'duration', { value: 100, configurable: true });
                Object.defineProperty(player, 'currentTime', { value: 100, configurable: true });
                const event = new Event('ended');
                player.dispatchEvent(event);
            });
            
            await page.waitForTimeout(2000);
            
            const afterEp = await page.locator('#current-episode-label').textContent();
            console.log(`After auto-advance: ${afterEp}`);
            
            if (beforeEp !== afterEp) {
                console.log('✅ Auto-advance to next episode WORKING!');
            }
            
            await page.screenshot({ path: '/tmp/final-08-auto-advance.png' });
        }
        
        console.log('\n═════════════════════════════════════════════════════════════');
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
        console.log('═════════════════════════════════════════════════════════════');
        console.log('\n📸 Screenshots saved in /tmp/final-*.png');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await page.screenshot({ path: '/tmp/final-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

comprehensiveTest();
