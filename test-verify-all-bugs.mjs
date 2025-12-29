import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 720 },
    permissions: [] 
  });
  const page = await context.newPage();

  console.log('🧪 VERIFICAÇÃO COMPLETA DE TODOS OS BUGS');
  console.log('=' .repeat(60));

  await page.goto('http://localhost:8000/');
  await page.waitForTimeout(3000);

  console.log('\n📋 BUG #1: Cor + Fundo desaparece');
  
  // Open profile modal  
  const editBtn = page.locator('#edit-profile-btn').first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await page.waitForTimeout(1000);
    
    // Set name
    await page.fill('#profile-name-input', 'VerificacaoCompleta');
    await page.waitForTimeout(500);
    
    // Select color (4th option - green)
    const colors = page.locator('.color-option');
    await colors.nth(3).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/playwright-logs/verify-bug1-01-color.png' });
    console.log('  ✓ Cor selecionada');
    
    // Switch to Fundos tab
    await page.click('button:has-text("Fundos")');
    await page.waitForTimeout(500);
    
    // Select background image (2nd option)
    const bgOptions = page.locator('.bg-image-option');
    await bgOptions.nth(1).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/playwright-logs/verify-bug1-02-with-bg.png' });
    console.log('  ✓ Fundo selecionado');
    
    // Verify both preserved
    const bgCheck = await page.evaluate(() => {
      const preview = document.getElementById('preview-bg');
      return {
        bgColor: preview?.style.backgroundColor || '',
        bgImage: preview?.style.backgroundImage || '',
        bothPresent: !!(preview?.style.backgroundColor && preview?.style.backgroundImage)
      };
    });
    
    console.log(`  ${bgCheck.bothPresent ? '✅' : '❌'} Cor + Fundo: ${bgCheck.bothPresent ? 'PRESERVADOS' : 'BUG!'}`);
    
    // Add frame
    await page.click('button:has-text("Molduras")');
    await page.waitForTimeout(500);
    const frameOpts = page.locator('.frame-option');
    if (await frameOpts.count() > 1) {
      await frameOpts.nth(1).click(); // Rainbow
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/tmp/playwright-logs/verify-bug4-01-frame.png' });
      console.log('\n📋 BUG #4: Moldura selecionada');
    }
    
    // Save
    await page.click('button:has-text("Salvar Perfil")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/playwright-logs/verify-profile-saved.png' });
    console.log('  ✓ Perfil salvo');
    
    // Check header avatar
    const headerCheck = await page.evaluate(() => {
      const avatar = document.getElementById('header-avatar');
      const bgLayer = document.getElementById('header-avatar-bg');
      const frameLayer = document.getElementById('header-avatar-frame');
      
      return {
        visible: avatar ? window.getComputedStyle(avatar).display !== 'none' : false,
        hasBg: !!bgLayer,
        hasFrame: !!frameLayer,
        frameClass: frameLayer?.className || ''
      };
    });
    
    console.log(`  ${headerCheck.visible ? '✅' : '❌'} Header avatar visível: ${headerCheck.visible}`);
    console.log(`  ${headerCheck.hasFrame ? '✅' : '❌'} Moldura no header: ${headerCheck.hasFrame}`);
    await page.screenshot({ path: '/tmp/playwright-logs/verify-bug4-02-header.png' });
    
    // Reopen to test Bug #5
    await page.waitForTimeout(1000);
    const editBtn2 = page.locator('#edit-profile-btn').first();
    if (await editBtn2.isVisible()) {
      await editBtn2.click();
      await page.waitForTimeout(1000);
      
      const nameLoaded = await page.inputValue('#profile-name-input');
      console.log(`\n📋 BUG #5: Edição carrega dados`);
      console.log(`  ${nameLoaded === 'VerificacaoCompleta' ? '✅' : '❌'} Nome carregado: "${nameLoaded}"`);
      await page.screenshot({ path: '/tmp/playwright-logs/verify-bug5-edit-loaded.png' });
      
      const closeBtn = page.locator('button:has-text("×")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Test episode selectors
  console.log('\n📋 BUG #2: Seletores de temporada/episódio');
  const cards = page.locator('.anime-card');
  const cardCount = await cards.count();
  console.log(`  - Found ${cardCount} anime cards`);
  
  if (cardCount > 0) {
    // First anime
    await cards.first().click();
    await page.waitForTimeout(2000);
    
    const anime1 = await page.evaluate(() => ({
      title: document.getElementById('video-title')?.textContent || '',
      seasons: document.getElementById('season-select')?.options.length || 0,
      episodes: document.getElementById('episode-select')?.options.length || 0
    }));
    
    console.log(`  Anime 1: ${anime1.title}`);
    console.log(`    - Temporadas: ${anime1.seasons}`);
    console.log(`    - Episódios: ${anime1.episodes}`);
    await page.screenshot({ path: '/tmp/playwright-logs/verify-bug2-anime1.png' });
    
    // Close and open second
    const close1 = page.locator('#close-video-modal, .modal-close-btn').first();
    if (await close1.isVisible()) {
      await close1.click();
      await page.waitForTimeout(500);
    }
    
    if (cardCount > 1) {
      await cards.nth(1).click();
      await page.waitForTimeout(2000);
      
      const anime2 = await page.evaluate(() => ({
        title: document.getElementById('video-title')?.textContent || '',
        seasons: document.getElementById('season-select')?.options.length || 0,
        episodes: document.getElementById('episode-select')?.options.length || 0
      }));
      
      console.log(`  Anime 2: ${anime2.title}`);
      console.log(`    - Temporadas: ${anime2.seasons}`);
      console.log(`    - Episódios: ${anime2.episodes}`);
      
      const different = anime1.title !== anime2.title && 
                       (anime1.episodes !== anime2.episodes || anime1.seasons !== anime2.seasons);
      console.log(`  ${different ? '✅' : '❌'} Seletores atualizam: ${different}`);
      await page.screenshot({ path: '/tmp/playwright-logs/verify-bug2-anime2.png' });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICAÇÃO COMPLETA FINALIZADA');
  
  await browser.close();
  process.exit(0);
})();
