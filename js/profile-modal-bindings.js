// Profile Modal Bindings with Defensive Guards
(function() {
    'use strict';
    
    function bindProfileModalControls() {
        // Inject full profile modal if missing (defensive)
        let profileModal = document.getElementById('profile-modal');
        if (!profileModal) {
            console.warn('Profile modal not found, creating it...');
            // The modal is already in index.html, so this is just defensive
            return;
        }
        
        // Get all elements defensively
        const elements = {
            pronounBtns: document.querySelectorAll('.pronoun-btn'),
            selectedPronoun: document.getElementById('selected-pronoun'),
            bgOptions: document.querySelectorAll('.bg-option'),
            gradientOptions: document.querySelectorAll('.gradient-option'),
            charOptions: document.querySelectorAll('.char-option'),
            charListPlaceholder: document.querySelector('.char-list-placeholder'),
            frameOptions: document.querySelectorAll('.frame-option'),
            saveProfile: document.getElementById('save-profile'),
            profileName: document.getElementById('profile-name'),
            avatarPreview: document.getElementById('avatar-preview'),
            loginBtn: document.getElementById('login-btn'),
            headerAvatar: document.getElementById('header-avatar')
        };
        
        // Relocate character options to placeholder if it exists
        if (elements.charListPlaceholder && elements.charOptions.length > 0) {
            elements.charOptions.forEach(charOption => {
                elements.charListPlaceholder.appendChild(charOption);
            });
        }
        
        // Pronoun button bindings
        if (elements.pronounBtns && elements.selectedPronoun) {
            elements.pronounBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    elements.pronounBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    elements.selectedPronoun.value = this.dataset.pronoun || '';
                    updateAvatarPreview();
                });
            });
        }
        
        // Color swatches
        if (elements.bgOptions) {
            elements.bgOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // Clear prior styles
                    elements.bgOptions.forEach(o => o.classList.remove('selected'));
                    elements.gradientOptions.forEach(o => o.classList.remove('selected'));
                    
                    this.classList.add('selected');
                    applyColorToAvatar(this);
                });
            });
        }
        
        // Gradient swatches
        if (elements.gradientOptions) {
            elements.gradientOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // Clear prior styles
                    elements.bgOptions.forEach(o => o.classList.remove('selected'));
                    elements.gradientOptions.forEach(o => o.classList.remove('selected'));
                    
                    this.classList.add('selected');
                    applyGradientToAvatar(this);
                });
            });
        }
        
        // Character selection
        if (elements.charOptions) {
            elements.charOptions.forEach(option => {
                option.addEventListener('click', function() {
                    elements.charOptions.forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    updateAvatarPreview();
                });
            });
        }
        
        // Frame selection
        if (elements.frameOptions) {
            elements.frameOptions.forEach(option => {
                option.addEventListener('click', function() {
                    elements.frameOptions.forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    applyFrameToAvatar(this);
                });
            });
        }
        
        // Save profile
        if (elements.saveProfile) {
            elements.saveProfile.addEventListener('click', function() {
                const name = elements.profileName?.value?.trim() || '';
                const pronoun = elements.selectedPronoun?.value || '-san';
                const selectedBg = document.querySelector('.bg-option.selected');
                const selectedGradient = document.querySelector('.gradient-option.selected');
                const selectedChar = document.querySelector('.char-option.selected');
                const selectedFrame = document.querySelector('.frame-option.selected');
                
                let bgStyle = '';
                if (selectedGradient) {
                    bgStyle = selectedGradient.dataset.css || '';
                } else if (selectedBg) {
                    bgStyle = window.getComputedStyle(selectedBg).backgroundColor || '#ff6b6b';
                } else {
                    bgStyle = '#ff6b6b';
                }
                
                const charId = selectedChar?.dataset.char || '1';
                const charImg = selectedChar?.querySelector('img')?.src || 'images/IMG_20250628_194234.png';
                const frame = selectedFrame?.dataset.frame || '';
                
                if (name) {
                    const profile = {
                        name,
                        pronoun,
                        avatarBg: bgStyle,
                        avatarChar: charId,
                        avatarCharImg: charImg,
                        frame
                    };
                    
                    // Save to localStorage
                    localStorage.setItem('userProfile', JSON.stringify(profile));
                    
                    // Update animeDB if available
                    if (window.animeDB && typeof window.animeDB.saveProfile === 'function') {
                        window.animeDB.saveProfile(profile);
                    }
                    
                    // Update header and avatar
                    updateHeaderAfterSave(profile);
                    
                    // Close modal
                    profileModal.style.display = 'none';
                    document.body.style.overflow = '';
                } else {
                    alert('Por favor, insira um nome.');
                }
            });
        }
        
        // Update preview on name input
        if (elements.profileName) {
            elements.profileName.addEventListener('input', updateAvatarPreview);
        }
        
        console.log('✅ Profile modal controls bound successfully');
    }
    
    function applyColorToAvatar(colorOption) {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        
        const avatarBg = preview.querySelector('.avatar-bg');
        if (!avatarBg) return;
        
        const color = window.getComputedStyle(colorOption).backgroundColor;
        
        // Clear gradient
        avatarBg.style.backgroundImage = '';
        avatarBg.style.backgroundColor = color;
    }
    
    function applyGradientToAvatar(gradientOption) {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        
        const avatarBg = preview.querySelector('.avatar-bg');
        if (!avatarBg) return;
        
        const gradient = gradientOption.dataset.css;
        
        // Clear solid color
        avatarBg.style.backgroundColor = '';
        avatarBg.style.backgroundImage = gradient;
    }
    
    function applyFrameToAvatar(frameOption) {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        
        const frameOverlay = preview.querySelector('.avatar-frame-overlay');
        if (!frameOverlay) return;
        
        const frame = frameOption.dataset.frame || '';
        
        // Clear all frame classes
        frameOverlay.className = 'avatar-frame-overlay';
        
        if (frame) {
            frameOverlay.classList.add(frame);
        }
    }
    
    function updateAvatarPreview() {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        
        const name = document.getElementById('profile-name')?.value || 'Nome';
        const pronoun = document.getElementById('selected-pronoun')?.value || '-san';
        const selectedChar = document.querySelector('.char-option.selected');
        
        const avatarName = preview.querySelector('.avatar-name');
        const avatarChar = preview.querySelector('.avatar-char');
        
        if (avatarName) {
            avatarName.textContent = `${name}${pronoun}`;
        }
        
        if (avatarChar && selectedChar) {
            const charImg = selectedChar.querySelector('img');
            if (charImg) {
                avatarChar.src = charImg.src;
            }
        }
    }
    
    function updateHeaderAfterSave(profile) {
        const loginBtn = document.getElementById('login-btn');
        const headerAvatar = document.getElementById('header-avatar');
        const headerAvatarImg = headerAvatar?.querySelector('img');
        
        if (loginBtn) {
            loginBtn.innerHTML = `<i class="fas fa-user"></i> ${profile.name}${profile.pronoun}`;
        }
        
        if (headerAvatar && headerAvatarImg) {
            headerAvatar.style.display = 'block';
            
            // Apply background (solid or gradient)
            if (profile.avatarBg.startsWith('linear-gradient') || profile.avatarBg.startsWith('radial-gradient')) {
                headerAvatar.style.backgroundImage = profile.avatarBg;
                headerAvatar.style.backgroundColor = '';
            } else {
                headerAvatar.style.backgroundColor = profile.avatarBg;
                headerAvatar.style.backgroundImage = '';
            }
            
            headerAvatarImg.src = profile.avatarCharImg || '';
            
            // Apply frame if present
            if (profile.frame) {
                headerAvatar.classList.add(profile.frame);
            }
        }
    }
    
    // Expose globally
    window.bindProfileModalControls = bindProfileModalControls;
    
    // Auto-bind on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindProfileModalControls);
    } else {
        bindProfileModalControls();
    }
    
})();
