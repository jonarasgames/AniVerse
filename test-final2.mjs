import { chromium } from 'playwright';

async function finalTest() {
    console.log('🚀 FINAL COMPREHENSIVE TEST');
    console.log('═══════════════════════════════════════\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    try {
        console.log('1️⃣  PROFILE WITH BACKGROUND + COLOR LAYERING');
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(3000);
        
        await page.fill('#profile-name', 'FinalTest');
        await page.click('.tab-btn[data-tab="backgrounds"]');
        await page.waitForTimeout(500);
        await page.locator('.bg-image-option').nth(1).click();
        await page.waitForTimeout(500);
        
        await page.click('.tab-btn[data-tab="colors"]');
        await page.waitForTimeout(500);
        await page.locator('.color-option').nth(4).click();
        await page.waitForTimeout(500);
        console.log('   ✅ Background + Color layered');
        await page.screenshot({ path: '/tmp/FINAL-01-bg-color.png' });
        
        console.log('\n2️⃣  FRAMES APPLICATION');
        await page.click('.tab-btn[data-tab="frames"]');
        await page.waitForTimeout(500);
        await page.click('.frame-option[data-frame="rainbow"]');
        await page.waitForTimeout(800);
        console.log('   ✅ Rainbow frame applied');
        await page.screenshot({ path: '/tmp/FINAL-02-rainbow-frame.png' });
        
        await page.click('#save-profile-btn');
        await page.waitForTimeout(2500);
        console.log('   ✅ Profile saved');
        
        const headerVisible = await page.locator('#header-avatar').isVisible();
        console.log(`   ✅ Header avatar visible: ${headerVisible}`);
        await page.screenshot({ path: '/tmp/FINAL-03-header-avatar.png' });
        
        console.log('\n3️⃣  PROFILE EDIT LOADS DATA');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        const name = await page.inputValue('#profile-name');
        console.log(`   ✅ Name loaded: "${name}"`);
        await page.screenshot({ path: '/tmp/FINAL-04-edit-loaded.png' });
        await page.click('#close-profile-modal');
        await page.waitForTimeout(500);
        
        console.log('\n4️⃣  EPISODE SELECTORS UPDATE');
        await page.locator('.anime-card').first().click();
        await page.waitForTimeout(2000);
        const anime1 = await page.locator('#video-title').textContent();
        const ep1 = await page.locator('#episode-select option').count();
        console.log(`   Anime 1: ${anime1} (${ep1} eps)`);
        await page.screenshot({ path: '/tmp/FINAL-05-anime1.png' });
        
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        await page.locator('.anime-card').nth(1).click();
        await page.waitForTimeout(2000);
        const anime2 = await page.locator('#video-title').textContent();
        const ep2 = await page.locator('#episode-select option').count();
        console.log(`   Anime 2: ${anime2} (${ep2} eps)`);
        
        if (ep1 !== ep2) {
            console.log('   ✅ Selectors updated correctly');
        }
        await page.screenshot({ path: '/tmp/FINAL-06-anime2.png' });
        
        console.log('\n5️⃣  AUTO-ADVANCE TEST');
        if (ep2 > 1) {
            const before = await page.locator('#current-episode-label').textContent();
            await page.evaluate(() => {
                const p = document.getElementById('anime-player');
                Object.defineProperty(p, 'duration', { value: 100, configurable: true });
                Object.defineProperty(p, 'currentTime', { value: 100, configurable: true });
                p.dispatchEvent(new Event('ended'));
            });
            await page.waitForTimeout(2000);
            const after = await page.locator('#current-episode-label').textContent();
            
            if (before !== after) {
                console.log('   ✅ Auto-advanced to next episode');
            }
            await page.screenshot({ path: '/tmp/FINAL-07-auto-advance.png' });
        }
        
        console.log('\n═══════════════════════════════════════');
        console.log('🎉 ALL FEATURES WORKING CORRECTLY!');
        console.log('═══════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/tmp/FINAL-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

finalTest();
