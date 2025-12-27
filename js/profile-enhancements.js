(function(){
    const SUGGESTION_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdEoNFG5O-D4RAbAtKVrkCChnG_YrhpOZri1q0-bkubzZDYmQ/viewform?embedded=true";

    function injectCSS() {
        if (document.querySelector('link[href="css/profile-enhancements.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/profile-enhancements.css';
        document.head.appendChild(link);
    }

    function createSuggestionButton() {
        const loginBtn = document.getElementById('login-btn');
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
        closeBtn.addEventListener('click', () => {
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
                <img src="https://i.ibb.co/0jq7R0y/anime-bg.jpg" alt="Personagem" class="avatar-char">
                <div class="avatar-frame-overlay"></div>
            </div>
            <div>
                <div class="avatar-name">Nome-san</div>
                <small class="muted">Escolha cor/gradiente / imagem / moldura</small>
            </div>
        `;
    }

    function injectCompactSelectors() {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;
        const saveBtn = modal.querySelector('#save-profile');
        if (!saveBtn) return;
        if (modal.querySelector('.profile-enhancements-injected')) return;

        const container = document.createElement('div');
        container.className = 'profile-enhancements-injected';
        container.innerHTML = `
            <div class="profile-sections" style="margin-top:12px;">
                <label>Pronome:</label>
                <div class="selector-row">
                    <div class="selector-scroll">
                        <button class="pronoun-btn" data-pronoun="-san">-san</button>
                        <button class="pronoun-btn" data-pronoun="-chan">-chan</button>
                        <button class="pronoun-btn" data-pronoun="-kun">-kun</button>
                        <button class="pronoun-btn" data-pronoun="">(sem sufixo)</button>
                    </div>
                    <input type="hidden" id="selected-pronoun" value="-san">
                </div>

                <label>Cor sólida:</label>
                <div class="selector-row">
                    <div class="selector-scroll">
                        <div class="bg-option" data-color="#ff6b6b" style="background:#ff6b6b;"></div>
                        <div class="bg-option" data-color="#6bffda" style="background:#6bffda;"></div>
                        <div class="bg-option" data-color="#6b8cff" style="background:#6b8cff;"></div>
                        <div class="bg-option" data-color="#ffd56b" style="background:#ffd56b;"></div>
                    </div>
                </div>

                <label>Gradientes:</label>
                <div class="selector-row">
                    <div class="selector-scroll">
                        <div class="gradient-option" data-css="linear-gradient(90deg,#ff9a9e,#fad0c4)" style="background:linear-gradient(90deg,#ff9a9e,#fad0c4);"></div>
                        <div class="gradient-option" data-css="linear-gradient(90deg,#a18cd1,#fbc2eb)" style="background:linear-gradient(90deg,#a18cd1,#fbc2eb);"></div>
                        <div class="gradient-option" data-css="linear-gradient(90deg,#f6d365,#fda085)" style="background:linear-gradient(90deg,#f6d365,#fda085);"></div>
                    </div>
                </div>

                <label>Fundo (atrás do personagem):</label>
                <div class="selector-row">
                    <div class="selector-scroll">
                        <div class="bg-image-option" data-src="images/bg1.png" data-fallback="#222"><img src="images/bg1-thumb.png" alt=""></div>
                        <div class="bg-image-option" data-src="images/bg2.png" data-fallback="#222"><img src="images/bg2-thumb.png" alt=""></div>
                        <div class="bg-image-option" data-src="images/bg3.png" data-fallback="#222"><img src="images/bg3-thumb.png" alt=""></div>
                    </div>
                </div>

                <label>Personagens:</label>
                <div class="selector-row">
                    <div class="selector-scroll char-list-placeholder">
                        <!-- Seus .char-option existentes serão realocados aqui automaticamente -->
                    </div>
                </div>

                <label>Molduras animadas:</label>
                <div class="selector-row">
                    <div class="selector-scroll">
                        <div class="frame-option" data-frame="frame-glow" title="Glow"></div>
                        <div class="frame-option" data-frame="frame-rainbow" title="Rainbow"></div>
                        <div class="frame-option" data-frame="frame-dash" title="Dash"></div>
                    </div>
                </div>
            </div>
        `;

        saveBtn.parentNode.insertBefore(container, saveBtn);

        const existingChars = modal.querySelectorAll('.char-option');
        const placeholder = container.querySelector('.char-list-placeholder');
        existingChars.forEach(ch => placeholder.appendChild(ch));

        // If your original setupProfileModal already ran before we injected elements, re-run it so event listeners attach
        if (typeof setupProfileModal === 'function') {
            try { setupProfileModal(); } catch (e) { console.warn('setupProfileModal re-run failed', e); }
        }

        // Update preview after injection
        if (typeof updateAvatarPreview === 'function') {
            try { updateAvatarPreview(); } catch (e) { console.warn('updateAvatarPreview failed', e); }
        }
    }

    function init() {
        injectCSS();
        createSuggestionModal();
        createSuggestionButton();
        replaceAvatarPreviewIfNeeded();
        injectCompactSelectors();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
