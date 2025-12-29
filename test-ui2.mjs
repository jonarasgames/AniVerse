import { chromium } from 'playwright';

async function testUI() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    try {
        console.log('1. Loading homepage...');
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/tmp/01-homepage.png' });
        console.log('  ✓ Screenshot: 01-homepage.png');
        
        // Check if modal is already open
        const modalVisible = await page.locator('#profile-modal').evaluate(el => {
            return el.style.display === 'flex' || el.classList.contains('active');
        });
        
        if (!modalVisible) {
            console.log('\n2. Opening profile modal...');
            await page.click('#login-btn', { timeout: 5000 });
            await page.waitForTimeout(1500);
        } else {
            console.log('\n2. Profile modal already open');
        }
        
        await page.screenshot({ path: '/tmp/02-profile-modal.png' });
        console.log('  ✓ Screenshot: 02-profile-modal.png');
        
        console.log('\n3. Customizing profile...');
        await page.fill('#profile-name', 'TestUser');
        
        // Backgrounds tab
        console.log('  - Testing backgrounds tab...');
        await page.click('.tab-btn[data-tab="backgrounds"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/03-backgrounds-tab.png' });
        
        // Select background
        const bgOptions = await page.locator('.bg-image-option').count();
        if (bgOptions > 1) {
            await page.locator('.bg-image-option').nth(1).click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: '/tmp/04-background-selected.png' });
            console.log('  ✓ Background selected');
        }
        
        // Colors tab
        console.log('  - Testing colors tab...');
        await page.click('.tab-btn[data-tab="colors"]');
        await page.waitForTimeout(500);
        await page.locator('.color-option').nth(2).click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/05-color-bg-layered.png' });
        console.log('  ✓ Color + Background layered');
        
        // Frames tab
        console.log('  - Testing frames tab...');
        await page.click('.tab-btn[data-tab="frames"]');
        await page.waitForTimeout(500);
        
        const frames = ['glow', 'rainbow', 'neon', 'fire'];
        for (let i = 0; i < frames.length; i++) {
            await page.click(`.frame-option[data-frame="${frames[i]}"]`);
            await page.waitForTimeout(800);
            await page.screenshot({ path: `/tmp/06-frame-${frames[i]}.png` });
        }
        console.log('  ✓ All frames tested');
        
        console.log('\n4. Saving profile...');
        await page.click('#save-profile-btn');
        await page.waitForTimeout(2500);
        await page.screenshot({ path: '/tmp/07-profile-saved.png' });
        console.log('  ✓ Profile saved');
        
        console.log('\n5. Checking header avatar...');
        await page.waitForTimeout(1000);
        const headerVisible = await page.locator('#header-avatar').isVisible();
        console.log(`  - Header avatar visible: ${headerVisible}`);
        await page.screenshot({ path: '/tmp/08-header-full.png' });
        await page.screenshot({ path: '/tmp/08-header-zoom.png', clip: { x: 900, y: 0, width: 380, height: 100 } });
        console.log('  ✓ Header screenshots taken');
        
        console.log('\n6. Testing profile edit (data reload)...');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/09-profile-edit-loaded.png' });
        
        // Check if name is loaded
        const nameValue = await page.inputValue('#profile-name');
        console.log(`  - Profile name loaded: "${nameValue}"`);
        
        await page.click('#close-profile-modal');
        await page.waitForTimeout(500);
        
        console.log('\n7. Testing profile selection...');
        await page.click('#header-avatar');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/10-profile-selection.png' });
        console.log('  ✓ Profile selection screen');
        
        console.log('\n✅ All tests completed!');
        console.log('\nScreenshots saved in /tmp/');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await page.screenshot({ path: '/tmp/error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testUI();
