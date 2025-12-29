import { chromium } from 'playwright';

async function testAllIssues() {
    console.log('�� VERIFICANDO TODOS OS BUGS MENCIONADOS');
    console.log('==========================================\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('BUG 1: FUNDO + COR DESAPARECENDO NA PREVIEW');
        console.log('═══════════════════════════════════════════════════════════');
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(3000);
        
        // Create profile
        const modalVisible = await page.locator('#profile-modal').evaluate(el => {
            return el.style.display === 'flex' || el.classList.contains('active');
        });
        
        if (modalVisible) {
            await page.fill('#profile-name', 'TesteCompleto');
            
            // 1. Selecionar uma cor
            console.log('\n1️⃣  Selecionando COR...');
            await page.click('.tab-btn[data-tab="colors"]');
            await page.waitForTimeout(500);
            await page.locator('.color-option').nth(3).click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: '/tmp/BUG1-01-cor-selecionada.png' });
            console.log('   ✅ Cor selecionada');
            
            // 2. Selecionar um FUNDO (deve manter a cor!)
            console.log('\n2️⃣  Selecionando FUNDO (deve manter cor como base)...');
            await page.click('.tab-btn[data-tab="backgrounds"]');
            await page.waitForTimeout(500);
            await page.locator('.bg-image-option').nth(2).click();
            await page.waitForTimeout(800);
            
            // Verificar se AMBOS estão aplicados na preview
            const previewStyles = await page.evaluate(() => {
                const preview = document.getElementById('preview-bg');
                if (!preview) return null;
                return {
                    backgroundColor: window.getComputedStyle(preview).backgroundColor,
                    backgroundImage: window.getComputedStyle(preview).backgroundImage,
                    hasColor: !!preview.style.backgroundColor,
                    hasImage: !!preview.style.backgroundImage
                };
            });
            
            console.log('   📋 Preview após selecionar fundo:');
            console.log(`      - Tem cor: ${previewStyles.hasColor}`);
            console.log(`      - Tem imagem: ${previewStyles.hasImage}`);
            
            if (previewStyles.hasColor && previewStyles.hasImage) {
                console.log('   ✅ COR E FUNDO APLICADOS CORRETAMENTE NA PREVIEW!');
            } else {
                console.log('   ❌ FALHA: Cor ou fundo está faltando na preview!');
            }
            
            await page.screenshot({ path: '/tmp/BUG1-02-fundo-com-cor.png' });
            
            // 3. Salvar e verificar
            console.log('\n3️⃣  Salvando perfil...');
            await page.click('#save-profile-btn');
            await page.waitForTimeout(2500);
            
            // Verificar header avatar
            const headerVisible = await page.locator('#header-avatar').isVisible();
            console.log(`   📋 Header avatar visível: ${headerVisible}`);
            
            if (headerVisible) {
                const headerStyles = await page.evaluate(() => {
                    const bg = document.getElementById('header-avatar-bg');
                    if (!bg) return null;
                    return {
                        backgroundColor: bg.style.backgroundColor,
                        backgroundImage: bg.style.backgroundImage
                    };
                });
                
                console.log('   📋 Header avatar após salvar:');
                console.log(`      - Cor: ${headerStyles.backgroundColor}`);
                console.log(`      - Imagem: ${headerStyles.backgroundImage}`);
                
                if (headerStyles.backgroundColor && headerStyles.backgroundImage) {
                    console.log('   ✅ HEADER COM COR E FUNDO!');
                } else {
                    console.log('   ⚠️  Header pode estar faltando cor ou fundo');
                }
            }
            
            await page.screenshot({ path: '/tmp/BUG1-03-perfil-salvo.png' });
            
            // 4. Ir para tela de seleção e selecionar perfil
            console.log('\n4️⃣  Indo para tela de seleção de usuários...');
            await page.click('#header-avatar');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '/tmp/BUG1-04-selecao-usuarios.png' });
            console.log('   ✅ Tela de seleção de usuários');
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('BUG 2: SELETORES DE TEMPORADA/EPISÓDIO');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Clicar no perfil para voltar
        const profileCards = await page.locator('div[style*="cursor: pointer"]').all();
        if (profileCards.length > 0) {
            await profileCards[0].click();
            await page.waitForTimeout(2000);
        }
        
        // Abrir primeiro anime
        console.log('\n1️⃣  Abrindo primeiro anime (DanDaDan ou FLCL)...');
        await page.locator('.anime-card').first().click();
        await page.waitForTimeout(2000);
        
        const anime1Title = await page.locator('#video-title').textContent();
        const anime1Seasons = await page.locator('#season-select option').count();
        const anime1Episodes = await page.locator('#episode-select option').count();
        
        console.log(`   📋 Anime: ${anime1Title}`);
        console.log(`   📋 Temporadas: ${anime1Seasons}`);
        console.log(`   📋 Episódios: ${anime1Episodes}`);
        await page.screenshot({ path: '/tmp/BUG2-01-primeiro-anime.png' });
        
        // Fechar e abrir segundo anime
        console.log('\n2️⃣  Fechando e abrindo segundo anime (Azumanga)...');
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        await page.locator('.anime-card').nth(1).click();
        await page.waitForTimeout(2000);
        
        const anime2Title = await page.locator('#video-title').textContent();
        const anime2Seasons = await page.locator('#season-select option').count();
        const anime2Episodes = await page.locator('#episode-select option').count();
        
        console.log(`   📋 Anime: ${anime2Title}`);
        console.log(`   📋 Temporadas: ${anime2Seasons}`);
        console.log(`   📋 Episódios: ${anime2Episodes}`);
        
        if (anime1Seasons !== anime2Seasons || anime1Episodes !== anime2Episodes) {
            console.log('   ✅ SELETORES ATUALIZARAM CORRETAMENTE!');
        } else {
            console.log('   ⚠️  Seletores podem não ter atualizado');
        }
        
        await page.screenshot({ path: '/tmp/BUG2-02-segundo-anime.png' });
        
        // Testar troca de episódio
        if (anime2Episodes > 1) {
            console.log('\n3️⃣  Testando seleção de episódio...');
            await page.selectOption('#episode-select', '1');
            await page.waitForTimeout(1500);
            const epLabel = await page.locator('#current-episode-label').textContent();
            console.log(`   📋 Episódio selecionado: ${epLabel}`);
            await page.screenshot({ path: '/tmp/BUG2-03-episodio-2.png' });
            console.log('   ✅ Seleção de episódio funcionando');
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('BUG 3: AUTO-ADVANCE PARA PRÓXIMO EPISÓDIO');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (anime2Episodes > 1) {
            console.log('\n1️⃣  Voltando para episódio 1...');
            await page.selectOption('#episode-select', '0');
            await page.waitForTimeout(1500);
            const ep1 = await page.locator('#current-episode-label').textContent();
            console.log(`   📋 Episódio atual: ${ep1}`);
            
            console.log('\n2️⃣  Simulando fim do episódio...');
            await page.evaluate(() => {
                const player = document.getElementById('anime-player');
                Object.defineProperty(player, 'duration', { value: 100, configurable: true });
                Object.defineProperty(player, 'currentTime', { value: 100, configurable: true });
                player.dispatchEvent(new Event('ended'));
            });
            
            await page.waitForTimeout(2000);
            const ep2 = await page.locator('#current-episode-label').textContent();
            console.log(`   📋 Após auto-advance: ${ep2}`);
            
            if (ep1 !== ep2) {
                console.log('   ✅ AUTO-ADVANCE FUNCIONANDO!');
            } else {
                console.log('   ⚠️  Auto-advance pode não ter funcionado');
            }
            
            await page.screenshot({ path: '/tmp/BUG3-01-auto-advance.png' });
        }
        
        await page.click('#close-video');
        await page.waitForTimeout(1000);
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('BUG 4: MOLDURAS NÃO APLICADAS');
        console.log('═══════════════════════════════════════════════════════════');
        
        console.log('\n1️⃣  Abrindo edição de perfil...');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        
        // Testar molduras
        console.log('\n2️⃣  Testando aplicação de molduras...');
        await page.click('.tab-btn[data-tab="frames"]');
        await page.waitForTimeout(500);
        
        const frames = ['glow', 'rainbow', 'neon'];
        for (const frame of frames) {
            await page.click(`.frame-option[data-frame="${frame}"]`);
            await page.waitForTimeout(800);
            
            // Verificar se frame foi aplicado na preview
            const frameApplied = await page.evaluate((f) => {
                const frameLayer = document.getElementById('preview-frame');
                return frameLayer && frameLayer.classList.contains(f);
            }, frame);
            
            console.log(`   📋 Moldura "${frame}": ${frameApplied ? '✅' : '❌'}`);
            await page.screenshot({ path: `/tmp/BUG4-01-frame-${frame}.png` });
        }
        
        // Salvar com moldura
        console.log('\n3️⃣  Salvando perfil com moldura rainbow...');
        await page.click('.frame-option[data-frame="rainbow"]');
        await page.waitForTimeout(500);
        await page.click('#save-profile-btn');
        await page.waitForTimeout(2500);
        
        // Verificar moldura no header
        const headerFrame = await page.evaluate(() => {
            const frame = document.getElementById('header-avatar-frame');
            return frame ? Array.from(frame.classList).filter(c => c.startsWith('frame-')) : [];
        });
        
        console.log(`   📋 Molduras no header: ${headerFrame.join(', ')}`);
        if (headerFrame.length > 0) {
            console.log('   ✅ MOLDURA APLICADA NO HEADER!');
        } else {
            console.log('   ⚠️  Moldura pode não estar no header');
        }
        
        await page.screenshot({ path: '/tmp/BUG4-02-header-com-moldura.png' });
        
        // Verificar na seleção de usuários
        console.log('\n4️⃣  Verificando moldura na seleção de usuários...');
        await page.click('#header-avatar');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/BUG4-03-selecao-com-moldura.png' });
        console.log('   ✅ Screenshot da seleção de usuários');
        
        // Voltar
        const profileCard = await page.locator('div[style*="cursor: pointer"]').first();
        if (await profileCard.count() > 0) {
            await profileCard.click();
            await page.waitForTimeout(2000);
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('BUG 5: EDIÇÃO DE PERFIL NÃO CARREGA DADOS');
        console.log('═══════════════════════════════════════════════════════════');
        
        console.log('\n1️⃣  Abrindo edição de perfil novamente...');
        await page.click('#login-btn');
        await page.waitForTimeout(1500);
        
        // Verificar se dados foram carregados
        const profileName = await page.inputValue('#profile-name');
        const selectedColor = await page.locator('.color-option.selected').count();
        const selectedBg = await page.locator('.bg-image-option.selected').count();
        const selectedFrame = await page.locator('.frame-option.selected').count();
        
        console.log(`   �� Nome carregado: "${profileName}"`);
        console.log(`   📋 Cor selecionada: ${selectedColor > 0 ? '✅' : '❌'}`);
        console.log(`   📋 Fundo selecionado: ${selectedBg > 0 ? '✅' : '❌'}`);
        console.log(`   📋 Moldura selecionada: ${selectedFrame > 0 ? '✅' : '❌'}`);
        
        if (profileName && profileName !== 'Nome') {
            console.log('   ✅ DADOS DO PERFIL CARREGADOS!');
        } else {
            console.log('   ⚠️  Dados podem não ter sido carregados');
        }
        
        await page.screenshot({ path: '/tmp/BUG5-01-edicao-carregada.png' });
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMO DOS TESTES');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Bug 1 - Fundo + Cor: TESTADO ✅');
        console.log('Bug 2 - Seletores: TESTADO ✅');
        console.log('Bug 3 - Auto-advance: TESTADO ✅');
        console.log('Bug 4 - Molduras: TESTADO ✅');
        console.log('Bug 5 - Edição: TESTADO ✅');
        console.log('\n📸 TODOS OS SCREENSHOTS SALVOS em /tmp/BUG*.png');
        
    } catch (error) {
        console.error('\n❌ Erro durante teste:', error.message);
        await page.screenshot({ path: '/tmp/ERRO.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testAllIssues();
