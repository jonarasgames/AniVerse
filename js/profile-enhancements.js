(function(){
    const SUGGESTION_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdEoNFG5O-D4RAbAtKVrkCChnG_YrhpOZri1q0-bkubzZDYmQ/viewform?embedded=true";
    const EXTRA_BG_URLS = [
        "https://files.catbox.moe/3ayemo.png",
        "https://files.catbox.moe/gltz5b.png",
        "https://files.catbox.moe/8ccmzg.png",
        "https://files.catbox.moe/zogpuf.png",
        "https://files.catbox.moe/mw942x.png",
        "https://files.catbox.moe/p55p9n.png",
        "https://files.catbox.moe/iu7nod.png",
        "https://files.catbox.moe/0oprd4.png"
    ];

    function injectCSS() {
        if (document.querySelector('link[href*="profile-enhancements.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/profile-enhancements.css';
        document.head.appendChild(link);
    }

    function createSuggestionButton() {
        const loginBtn = document.getElementById('login-btn');
        const existing = document.getElementById('suggest-anime-btn');
        if (existing) return;
        const btn = document.createElement('button');
        btn.id = 'suggest-anime-btn';
        btn.className = 'btn btn-secondary';
        btn.title = 'Sugerir anime';
        btn.textContent = 'Sugerir anime';
        btn.style.marginLeft = '8px';

        if (loginBtn && loginBtn.parentNode) {
            loginBtn.parentNode.insertBefore(btn, loginBtn.nextSibling);
        } else {
            const footerContainer = document.querySelector('footer .container') || document.querySelector('footer') || document.body;
            footerContainer.appendChild(btn);
        }

        btn.addEventListener('click', openSuggestionModal);
    }

    function createSuggestionModal() {
        if (document.getElementById('suggestion-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'suggestion-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:900px; width:95%; height:80vh; padding:10px;">
                <span class="close-modal" style="right:10px; top:6px; cursor:pointer; font-size:24px;">&times;</span>
                <iframe src="" style="width:100%; height:100%; border:0;" frameborder="0" scrolling="yes" loading="lazy" title="Sugestão de anime"></iframe>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    function openSuggestionModal() {
        const modal = document.getElementById('suggestion-modal');
        if (!modal) return;
        const iframe = modal.querySelector('iframe');
        if (iframe && iframe.src !== SUGGESTION_FORM_EMBED_URL) iframe.src = SUGGESTION_FORM_EMBED_URL;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function replaceAvatarPreviewIfNeeded() {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        if (preview.dataset.enhanced === '1') return;

        preview.dataset.enhanced = '1';
        preview.innerHTML = `
            <div class="avatar-bg" style="background-color: #ff6b6b;">
                <div class="avatar-layer-bg"></div>
                <img src="images/bg-default.jpg" alt="Personagem" class="avatar-char" style="object-fit:cover; width:100%; height:100%;">
                <div class="avatar-frame-overlay"></div>
            </div>
            <div>
                <div class="avatar-name">Nome-san</div>
                <small class="muted">Escolha cor/gradiente / imagem / moldura</small>
            </div>
        `;
    }

    function injectBgImageOptions(container) {
        if (!container) return;
        // avoid injecting twice
        if (container.querySelector('.bg-image-option')) return;

        EXTRA_BG_URLS.forEach((url) => {
            const el = document.createElement('div');
            el.className = 'bg-image-option';
            el.dataset.src = url;
            el.title = 'Usar imagem de fundo';
            el.innerHTML = `<img src="${url}" alt="">`;
            container.appendChild(el);
            el.addEventListener('click', () => {
                applyBgImage(url);
                container.querySelectorAll('.bg-image-option').forEach(n => n.classList.remove('selected'));
                el.classList.add('selected');
            });
        });
    }

    function applyBgImage(url) {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        const avatarBg = preview.querySelector('.avatar-bg') || preview;
        if (!avatarBg) return;
        const layer = avatarBg.querySelector('.avatar-layer-bg');
        // apply to the visible layer; clear gradients
        if (layer) {
            layer.style.backgroundImage = `url('${url}')`;
            layer.style.backgroundSize = 'cover';
            layer.style.backgroundPosition = 'center';
            // if avatarBg itself had a gradient or image, clear it to avoid layering issues
            avatarBg.style.backgroundImage = '';
        } else {
            avatarBg.style.backgroundImage = `url('${url}')`;
            avatarBg.style.backgroundSize = 'cover';
            avatarBg.style.backgroundPosition = 'center';
        }
    }

    function bindDynamicSelectors() {
        let modal = document.getElementById('profile-modal');
        if (!modal) modal = document.querySelector('.profile-modal') || document.querySelector('#profileModal');
        if (!modal) return;

        // gradients
        modal.querySelectorAll('.gradient-option').forEach(el => {
            el.addEventListener('click', () => {
                const css = el.dataset.css || el.getAttribute('data-css') || '';
                const preview = document.getElementById('avatar-preview');
                if (!preview) return;
                const avatarBg = preview.querySelector('.avatar-bg') || preview;
                if (!avatarBg) return;
                // apply gradient as background-image
                try {
                    avatarBg.style.backgroundImage = css || '';
                } catch (e) {
                    avatarBg.style.backgroundImage = '';
                }
                avatarBg.style.backgroundSize = 'cover';
                avatarBg.style.backgroundPosition = 'center';
                const layer = avatarBg.querySelector('.avatar-layer-bg');
                if (layer) layer.style.backgroundImage = '';
                modal.querySelectorAll('.gradient-option').forEach(n => n.classList.remove('selected'));
                el.classList.add('selected');
            });
        });

        // frame options
        modal.querySelectorAll('.frame-option').forEach(el => {
            el.addEventListener('click', () => {
                const frame = el.dataset.frame || el.getAttribute('data-frame') || '';
                const preview = document.getElementById('avatar-preview');
                if (!preview) return;
                const overlay = preview.querySelector('.avatar-frame-overlay');
                if (!overlay) return;
                // remove any class starting with 'frame-'
                overlay.classList.forEach(c => {
                    if (/^frame-/.test(c)) overlay.classList.remove(c);
                });
                if (frame) overlay.classList.add(frame);
                modal.querySelectorAll('.frame-option').forEach(n => n.classList.remove('selected'));
                el.classList.add('selected');
            });
        });

        // bg-image container population - try a few heuristics
        const hasBgInjected = modal.querySelector('.bg-image-option');
        if (!hasBgInjected) {
            const candidateSelectors = [
                '.selector-scroll', '.bg-options-grid', '.selector-row', '.selector-scroll .char-list-placeholder'
            ];
            let injected = false;
            for (const sel of candidateSelectors) {
                const node = modal.querySelector(sel);
                if (node && node instanceof HTMLElement) {
                    injectBgImageOptions(node);
                    injected = true;
                    break;
                }
            }
            // fallback: try to find label mentioning fundo
            if (!injected) {
                const labels = Array.from(modal.querySelectorAll('label'));
                const bgLabel = labels.find(l => /Fundo|fundo|Fundo \(atrás do personagem\)/i.test(l.textContent));
                if (bgLabel) {
                    const row = bgLabel.parentElement.querySelector('.selector-row') || bgLabel.parentElement.querySelector('.bg-options-grid') || bgLabel.nextElementSibling;
                    const scroll = row ? (row.querySelector('.selector-scroll') || row) : null;
                    if (scroll) injectBgImageOptions(scroll);
                }
            }
        }

        // make char options clickable (they might have been moved)
        modal.querySelectorAll('.char-option').forEach(el => {
            el.addEventListener('click', () => {
                modal.querySelectorAll('.char-option').forEach(n => n.classList.remove('selected'));
                el.classList.add('selected');
                const img = el.querySelector('img');
                if (img) {
                    const preview = document.getElementById('avatar-preview');
                    if (!preview) return;
                    const avatarImg = preview.querySelector('.avatar-char');
                    if (avatarImg) {
                        avatarImg.src = img.src;
                        // ensure styling if CSS wasn't loaded yet
                        avatarImg.style.objectFit = 'cover';
                        avatarImg.style.width = '100%';
                        avatarImg.style.height = '100%';
                    }
                }
            });
        });

        // pronoun buttons
        modal.querySelectorAll('.pronoun-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.pronoun-btn').forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                const hidden = modal.querySelector('#selected-pronoun');
                if (hidden) hidden.value = btn.dataset.pronoun || btn.getAttribute('data-pronoun') || '';
                const nameEl = document.querySelector('.avatar-name');
                if (nameEl) {
                    const baseName = document.getElementById('profile-name') ? document.getElementById('profile-name').value || 'Nome' : 'Nome';
                    nameEl.textContent = baseName + (btn.dataset.pronoun || btn.getAttribute('data-pronoun') || '');
                }
            });
        });

        // profile name input update
        const nameInput = modal.querySelector('#profile-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const nameEl = document.querySelector('.avatar-name');
                const pron = modal.querySelector('#selected-pronoun') ? modal.querySelector('#selected-pronoun').value : '';
                if (nameEl) nameEl.textContent = (nameInput.value || 'Nome') + (pron || '');
            });
        }
    }

    function setupSkipButton() {
        const player = document.getElementById('anime-player');
        const skipBtn = document.getElementById('skip-opening-btn');
        if (!player || !skipBtn) return;

        // guard: ensure skipBtn has a counter element
        const counter = skipBtn.querySelector('#skip-counter');

        let openingLen = 0;
        // prefer dataset (data-opening-length)
        if (player.dataset && player.dataset.openingLength) openingLen = parseInt(player.dataset.openingLength, 10) || 0;
        // fallback to global
        if (!openingLen && window.currentEpisode && window.currentEpisode.openingLength) openingLen = parseInt(window.currentEpisode.openingLength, 10) || 0;

        const showOrHide = () => {
            if (openingLen > 0) skipBtn.style.display = '';
            else skipBtn.style.display = 'none';
        };

        const update = () => {
            if (!player || typeof player.currentTime !== 'number') return;
            const timeLeft = Math.max(0, Math.ceil(openingLen - player.currentTime));
            if (counter) counter.textContent = timeLeft;
        };

        showOrHide();

        if (openingLen > 0) {
            // ensure we update once metadata is available
            if (player.readyState >= 1) update();
            else player.addEventListener('loadedmetadata', update, {once:true});
            player.addEventListener('timeupdate', update);
            skipBtn.addEventListener('click', () => {
                try { player.currentTime = openingLen; } catch (e) { console.warn('could not set currentTime', e); }
                update();
            });
            // initial update
            setTimeout(update, 100);
        }
    }

    function init() {
        injectCSS();
        createSuggestionModal();
        createSuggestionButton();
        replaceAvatarPreviewIfNeeded();
        // small delay to ensure modal existing markup is present
        setTimeout(() => {
            injectCompactSelectors();
            bindDynamicSelectors();
            setupSkipButton();
        }, 120);
    }

    // Ensure we don't break if original injectCompactSelectors doesn't exist
    function injectCompactSelectors() {
        // try to run existing function if present
        if (typeof window.injectCompactSelectorsOriginal === 'function') {
            try { window.injectCompactSelectorsOriginal(); } catch (e) { console.warn('original inject failed', e); }
        }
        // If the compact markup isn't present, we assume index.html already contains the structure.
    }

    // Expose bindProfileModalControls globally
    window.bindProfileModalControls = function() {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;

        // Relocate character options to char-list-placeholder
        const charPlaceholder = modal.querySelector('.char-list-placeholder');
        const charContainer = modal.querySelector('.character-options-container');
        if (charPlaceholder && charContainer) {
            const charOptions = Array.from(charContainer.querySelectorAll('.char-option'));
            charOptions.forEach(option => {
                charPlaceholder.appendChild(option);
            });
        }

        // Bind pronoun buttons
        modal.querySelectorAll('.pronoun-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                modal.querySelectorAll('.pronoun-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const pronounInput = modal.querySelector('#selected-pronoun');
                if (pronounInput) pronounInput.value = this.dataset.pronoun || '';
                updateAvatarPreviewInModal();
            });
        });

        // Bind bg-option (color swatches)
        modal.querySelectorAll('.bg-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.bg-option').forEach(o => o.classList.remove('selected'));
                modal.querySelectorAll('.gradient-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                applyColor(this);
                updateAvatarPreviewInModal();
            });
        });

        // Bind gradient-option
        modal.querySelectorAll('.gradient-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.gradient-option').forEach(o => o.classList.remove('selected'));
                modal.querySelectorAll('.bg-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                applyGradient(this);
            });
        });

        // Bind frame-option
        modal.querySelectorAll('.frame-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.frame-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                applyFrame(this);
            });
        });

        // Bind char-option
        modal.querySelectorAll('.char-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.char-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                updateAvatarPreviewInModal();
            });
        });

        // Bind profile name input
        const nameInput = modal.querySelector('#profile-name');
        if (nameInput) {
            nameInput.addEventListener('input', updateAvatarPreviewInModal);
        }

        // Bind save button
        const saveBtn = modal.querySelector('#save-profile');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const name = (nameInput?.value || '').trim();
                const pronounInput = modal.querySelector('#selected-pronoun');
                const pronoun = pronounInput?.value || '-san';
                const selectedBgOption = modal.querySelector('.bg-option.selected');
                const bgColor = selectedBgOption ? window.getComputedStyle(selectedBgOption).backgroundColor : '#ff6b6b';
                const selectedChar = modal.querySelector('.char-option.selected');
                const char = selectedChar?.dataset.char || '1';
                const charImg = selectedChar?.querySelector('img')?.src || '';
                
                const selectedGradient = modal.querySelector('.gradient-option.selected');
                const gradientCss = selectedGradient?.dataset.css || '';
                
                const selectedFrame = modal.querySelector('.frame-option.selected');
                const frame = selectedFrame?.dataset.frame || '';

                if (name && window.animeDB) {
                    const profile = {
                        name,
                        pronoun,
                        avatarBg: gradientCss || bgColor,
                        avatarChar: char,
                        avatarCharImg: charImg,
                        avatarFrame: frame
                    };
                    
                    localStorage.setItem('userProfile', JSON.stringify(profile));
                    animeDB.saveProfile(profile);
                    
                    modal.style.display = 'none';
                    
                    // Update header UI
                    const loginBtn = document.getElementById('login-btn');
                    const headerAvatar = document.getElementById('header-avatar');
                    if (loginBtn) {
                        loginBtn.innerHTML = `<i class="fas fa-user"></i> ${name}${pronoun}`;
                    }
                    if (headerAvatar) {
                        headerAvatar.style.display = 'block';
                        headerAvatar.style.backgroundColor = bgColor;
                        const img = headerAvatar.querySelector('img');
                        if (img) img.src = charImg;
                    }
                    
                    if (typeof updateProfileDisplay === 'function') {
                        updateProfileDisplay();
                    }
                } else {
                    alert('Por favor, preencha o nome do perfil.');
                }
            });
        }

        // Helper function to apply color and clear conflicting styles
        function applyColor(colorOption) {
            const preview = modal.querySelector('#avatar-preview');
            if (!preview) return;
            const avatarBg = preview.querySelector('.avatar-bg');
            if (!avatarBg) return;
            
            const bgColor = window.getComputedStyle(colorOption).backgroundColor;
            avatarBg.style.backgroundColor = bgColor;
            avatarBg.style.backgroundImage = ''; // Clear gradient/image
            
            const layer = avatarBg.querySelector('.avatar-layer-bg');
            if (layer) layer.style.backgroundImage = '';
        }
        
        // Helper function to apply gradient and clear conflicting styles
        function applyGradient(gradientOption) {
            const preview = modal.querySelector('#avatar-preview');
            if (!preview) return;
            const avatarBg = preview.querySelector('.avatar-bg');
            if (!avatarBg) return;
            
            const css = gradientOption.dataset.css || '';
            avatarBg.style.backgroundImage = css; // Apply gradient
            avatarBg.style.backgroundColor = ''; // Clear solid color
            
            const layer = avatarBg.querySelector('.avatar-layer-bg');
            if (layer) layer.style.backgroundImage = '';
        }
        
        // Helper function to apply frame
        function applyFrame(frameOption) {
            const preview = modal.querySelector('#avatar-preview');
            if (!preview) return;
            const overlay = preview.querySelector('.avatar-frame-overlay');
            if (!overlay) return;
            
            overlay.className = 'avatar-frame-overlay';
            const frame = frameOption.dataset.frame || '';
            if (frame) overlay.classList.add(frame);
        }

        function updateAvatarPreviewInModal() {
            const preview = modal.querySelector('#avatar-preview');
            if (!preview) return;
            
            const name = nameInput?.value || 'Nome';
            const pronounInput = modal.querySelector('#selected-pronoun');
            const pronoun = pronounInput?.value || '-san';
            const selectedBgOption = modal.querySelector('.bg-option.selected');
            const bgColor = selectedBgOption ? window.getComputedStyle(selectedBgOption).backgroundColor : '#ff6b6b';
            const selectedChar = modal.querySelector('.char-option.selected');
            const charImg = selectedChar?.querySelector('img')?.src || '';
            
            const avatarBg = preview.querySelector('.avatar-bg');
            const avatarChar = preview.querySelector('.avatar-char');
            const avatarName = preview.querySelector('.avatar-name');
            
            if (avatarBg && !modal.querySelector('.gradient-option.selected')) {
                avatarBg.style.backgroundColor = bgColor;
                avatarBg.style.backgroundImage = '';
            }
            if (avatarChar) avatarChar.src = charImg;
            if (avatarName) avatarName.textContent = `${name}${pronoun}`;
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
