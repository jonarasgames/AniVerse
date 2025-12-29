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
        console.log('  ✓ Screenshot saved');
        
        console.log('\n2. Opening profile modal...');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/02-profile-modal.png' });
        console.log('  ✓ Screenshot saved');
        
        console.log('\n3. Customizing profile...');
        await page.fill('#profile-name', 'TestUser');
        
        // Backgrounds tab
        await page.click('.tab-btn[data-tab="backgrounds"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/03-backgrounds-tab.png' });
        
        // Select background
        await page.click('.bg-image-option >> nth=1');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/04-background-selected.png' });
        
        // Colors tab + select color
        await page.click('.tab-btn[data-tab="colors"]');
        await page.waitForTimeout(500);
        await page.click('.color-option >> nth=2');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/05-color-bg-layered.png' });
        console.log('  ✓ Color + Background layering');
        
        // Frames tab
        await page.click('.tab-btn[data-tab="frames"]');
        await page.waitForTimeout(500);
        
        // Glow frame
        await page.click('.frame-option[data-frame="glow"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/06-frame-glow.png' });
        
        // Rainbow frame
        await page.click('.frame-option[data-frame="rainbow"]');
        await page.waitForTimeout(800);
        await page.screenshot({ path: '/tmp/07-frame-rainbow.png' });
        
        // Neon frame
        await page.click('.frame-option[data-frame="neon"]');
        await page.waitForTimeout(800);
        await page.screenshot({ path: '/tmp/08-frame-neon.png' });
        console.log('  ✓ Frames tested');
        
        console.log('\n4. Saving profile...');
        await page.click('#save-profile-btn');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/09-saved.png' });
        
        console.log('\n5. Header avatar...');
        await page.screenshot({ path: '/tmp/10-header.png', clip: { x: 900, y: 0, width: 380, height: 100 } });
        
        console.log('\n6. Edit profile (reload test)...');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/11-edit-loaded.png' });
        
        await page.click('#close-profile-modal');
        await page.waitForTimeout(500);
        
        console.log('\n7. Profile selection...');
        await page.click('#header-avatar');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '/tmp/12-profile-selection.png' });
        
        console.log('\n✅ Done! Screenshots in /tmp/');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        await page.screenshot({ path: '/tmp/error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testUI();
