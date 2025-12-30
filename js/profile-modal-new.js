/* js/profile-modal-new.js - Modern profile modal logic */
(function() {
    'use strict';

    let currentProfileData = {
        name: 'Nome',
        pronoun: '-san',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: null,
        characterImage: 'images/IMG_20250628_194234.png',
        frame: '',
        password: null
    };

    // Character images list
    const characterImages = [
                'images/IMG_20250628_194234.png',
        'images/IMG_20250628_194245.png',
        'images/IMG_20250628_194305.png',
        'images/IMG_20250628_194357.png',
        'images/IMG_20250628_194904.png',
        'images/IMG_20250628_194935.png',
        'images/IMG_20250628_194950.png',
        'images/IMG_20250628_203536.png',
        'images/IMG_20250628_203813.png',
        'images/IMG_20250628_203832.png',
        'images/IMG_20250629_103041.png',
        'images/IMG_20250629_103055.png',
        'images/IMG_20250629_103125.png',
        'images/IMG_20250629_103206.png',
        'images/IMG_20250629_103221.png',
        'images/IMG_20250629_103234.png',
        'images/IMG_20250701_144109.png',
        'images/IMG_20250701_144133.png',
        'images/IMG_20250701_144201.png',
        'images/IMG_20250707_193349.png',
        'images/IMG_20250707_193432.png',
        'images/IMG_20250707_193452.png',
        'images/IMG_20250707_193511.png',
        'images/IMG_20250707_193600.png',
        'images/dan-da-dan-66bb02e694458_waifu2x_art_scan_noise3_scale%20(1).png',
        'images/dan-da-dan-66bb02e93a299_waifu2x_art_scan_noise3_scale%20(1).png',
        'images/dan-da-dan-66bb02eb45d02_waifu2x_art_scan_noise3_scale%20(1).png',
        'images/dan-da-dan-66bb02ed34fe2_waifu2x_art_scan_noise3_scale%20(1).png',
        'https://files.catbox.moe/hzfakv.png',
        'https://files.catbox.moe/y9vkdp.png',
        'https://files.catbox.moe/brb24b.png',
        'https://files.catbox.moe/d6d8nj.png',
        'https://files.catbox.moe/9u9q5f.png',
        'https://files.catbox.moe/0py2dw.png',
        'https://files.catbox.moe/zlv0pz.png',
        'https://files.catbox.moe/fffiz4.png',
        'https://files.catbox.moe/utg1zo.png',
        'https://files.catbox.moe/vflimo.png',
        'https://files.catbox.moe/e1lwr1.png',
        'https://files.catbox.moe/a75eag.png',
        'https://files.catbox.moe/jllqi5.png',
        'https://files.catbox.moe/rkevwj.png',
        'https://files.catbox.moe/ojvj57.png',
        'https://files.catbox.moe/4gh5np.png',
        'https://files.catbox.moe/ayrb1r.png',
        'https://files.catbox.moe/ow8rex.png',
        'https://files.catbox.moe/bo8klv.png',
        'https://files.catbox.moe/729rei.png',
        'https://files.catbox.moe/v9hd3f.png',
        'https://files.catbox.moe/5ss5tq.png',
        'https://files.catbox.moe/2v3ryn.png',
        'https://files.catbox.moe/655l9a.png',
        'https://files.catbox.moe/y1lpry.png',
        'https://files.catbox.moe/xt4t6q.png',
        'https://files.catbox.moe/53jooy.png',
        'https://files.catbox.moe/9c01hk.png',
        'https://files.catbox.moe/1uguir.png',
        'https://files.catbox.moe/cbqoe0.png',
        'https://files.catbox.moe/xouujb.png',
        'https://files.catbox.moe/o3rfpi.png',
        'https://files.catbox.moe/3uf2t8.png',
        'https://files.catbox.moe/1xzdym.png',
        'https://files.catbox.moe/jyb8i3.png',
        'https://files.catbox.moe/itdqg5.png',
        'https://files.catbox.moe/tqcgn6.png',
        'https://files.catbox.moe/ogae3r.png',
        'https://files.catbox.moe/lpuhiq.png',
        'https://files.catbox.moe/8imn6y.png',
        'https://files.catbox.moe/cj2n1i.png',
        'https://files.catbox.moe/h1z6ig.png',
        'https://files.catbox.moe/8t9teq.png'
    ];

    function initProfileModal() {
        const modal = document.getElementById('profile-modal');
        const closeBtn = document.getElementById('close-profile-modal');
        const saveBtn = document.getElementById('save-profile-btn');
        const nameInput = document.getElementById('profile-name');
        
        if (!modal) {
            console.warn('Profile modal not found');
            return;
        }

        // Close button handler
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Pronoun pills
        const pronounPills = document.querySelectorAll('.pronoun-pill');
        pronounPills.forEach(pill => {
            pill.addEventListener('click', () => {
                pronounPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentProfileData.pronoun = pill.dataset.pronoun || '';
                document.getElementById('selected-pronoun').value = currentProfileData.pronoun;
                updatePreview();
            });
        });

        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Color options
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Don't clear background image selections - allow layering
                // document.querySelectorAll('.bg-image-option').forEach(o => o.classList.remove('selected'));
                
                colorOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                currentProfileData.backgroundColor = option.dataset.value;
                // DON'T clear background image - keep it for layering
                // currentProfileData.backgroundImage = null;
                updatePreview();
            });
        });

        // Generate character grid
        generateCharacterGrid();

        // Frame options
        const frameOptions = document.querySelectorAll('.frame-option');
        frameOptions.forEach(option => {
            option.addEventListener('click', () => {
                frameOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                currentProfileData.frame = option.dataset.frame || '';
                updatePreview();
            });
        });

        // Name input
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                currentProfileData.name = nameInput.value || 'Nome';
                updatePreview();
            });
        }
        
        // Password input
        const passwordInput = document.getElementById('profile-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                currentProfileData.password = passwordInput.value.trim() || null;
            });
        }
        
        // Initialize background images grid
        initBackgroundImagesGrid();

        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveProfile();
            });
        }

        // Initialize preview
        updatePreview();
    }

    function generateCharacterGrid() {
        const characterGrid = document.getElementById('character-grid');
        if (!characterGrid) return;

        characterGrid.innerHTML = '';
        
        characterImages.forEach((imgSrc, index) => {
            const option = document.createElement('div');
            option.className = 'character-option';
            if (index === 0) option.classList.add('selected');
            
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = `Personagem ${index + 1}`;
            
            option.appendChild(img);
            option.addEventListener('click', () => {
                document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                currentProfileData.characterImage = imgSrc;
                updatePreview();
            });
            
            characterGrid.appendChild(option);
        });
    }
    
    function initBackgroundImagesGrid() {
        const bgImagesGrid = document.getElementById('background-images-grid');
        if (!bgImagesGrid) return;
        
        const bgImages = [
            'https://files.catbox.moe/0920l8.png',
            'https://files.catbox.moe/3ayemo.png',
            'https://files.catbox.moe/gltz5b.png',
            'https://files.catbox.moe/8ccmzg.png',
            'https://files.catbox.moe/zogpuf.png',
            'https://files.catbox.moe/mw942x.png',
            'https://files.catbox.moe/p55p9n.png',
            'https://files.catbox.moe/iu7nod.png',
            'https://files.catbox.moe/0oprd4.png'
        ];
        
        // Add "No background" option first
        bgImagesGrid.innerHTML = `
            <div class="bg-image-option bg-none-option" data-src="">
                <div style="width: 100%; height: 100%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">✕</div>
            </div>
        ` + bgImages.map((src, idx) => `
            <div class="bg-image-option" data-src="${src}">
                <img src="${src}" alt="Fundo ${idx + 1}">
            </div>
        `).join('');
        
        // Event listeners
        bgImagesGrid.querySelectorAll('.bg-image-option').forEach(opt => {
            opt.addEventListener('click', () => {
                bgImagesGrid.querySelectorAll('.bg-image-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                currentProfileData.backgroundImage = opt.dataset.src || null;
                updatePreview();
            });
        });
    }

    function updatePreview() {
        const previewBg = document.getElementById('preview-bg');
        const previewChar = document.getElementById('preview-char');
        const previewFrame = document.getElementById('preview-frame');
        const previewName = document.getElementById('preview-name');

        if (previewBg) {
            // Reset all background properties first
            previewBg.style.background = '';
            previewBg.style.backgroundColor = '';
            previewBg.style.backgroundImage = '';
            previewBg.style.backgroundSize = '';
            previewBg.style.backgroundPosition = '';
            
            // Layer 1: Background color/gradient (base layer, always present)
            if (currentProfileData.backgroundColor) {
                if (currentProfileData.backgroundColor.startsWith('linear-gradient') || 
                    currentProfileData.backgroundColor.startsWith('radial-gradient')) {
                    previewBg.style.background = currentProfileData.backgroundColor;
                } else {
                    previewBg.style.backgroundColor = currentProfileData.backgroundColor;
                }
            } else {
                // Default gradient if no color
                previewBg.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
            
            // Layer 2: Background image (on top of color, if present)
            if (currentProfileData.backgroundImage) {
                previewBg.style.backgroundImage = `url('${currentProfileData.backgroundImage}')`;
                previewBg.style.backgroundSize = 'cover';
                previewBg.style.backgroundPosition = 'center';
            }
        }

        // Layer 3: Character image (on top of everything via z-index in CSS)
        if (previewChar && currentProfileData.characterImage) {
            previewChar.src = currentProfileData.characterImage;
        }

        // Layer 4: Frame (on top via z-index in CSS)
        if (previewFrame) {
            previewFrame.className = 'avatar-frame-layer';
            if (currentProfileData.frame) {
                previewFrame.classList.add(currentProfileData.frame);
            }
        }

        if (previewName) {
            previewName.textContent = currentProfileData.name + currentProfileData.pronoun;
        }
    }

    function saveProfile() {
        // Get the profile manager if available
        if (window.profileManager) {
            const modal = document.getElementById('profile-modal');
            const editingProfileId = modal?.dataset.editingProfileId;
            
            if (editingProfileId) {
                // Update existing profile
                window.profileManager.updateProfile(editingProfileId, {
                    name: currentProfileData.name,
                    pronoun: currentProfileData.pronoun,
                    avatar: {
                        backgroundColor: currentProfileData.backgroundColor,
                        backgroundImage: currentProfileData.backgroundImage,
                        characterImage: currentProfileData.characterImage,
                        frame: currentProfileData.frame,
                        gradient: currentProfileData.backgroundColor.startsWith('linear-gradient') ? 
                                 currentProfileData.backgroundColor : null
                    }
                });
                
                // Update header avatar
                const updatedProfile = window.profileManager.getProfile(editingProfileId);
                updateHeaderAvatar(updatedProfile);
                
                // Also call loadProfileData if available to ensure header is shown
                if (typeof window.loadProfileData === 'function') {
                    window.loadProfileData(updatedProfile);
                } else {
                    // Fallback: make header visible
                    const headerAvatar = document.getElementById('header-avatar');
                    if (headerAvatar) headerAvatar.style.display = 'flex';
                }
                
                // Show success message
                showSuccessMessage('Perfil atualizado com sucesso!');
                
                // Clear editing flag
                delete modal.dataset.editingProfileId;
            } else {
                // No editingProfileId means we're in create mode
                // Don't automatically update active profile - let profile-multi.js handle it
                // This function should only handle the case when explicitly editing a profile
                return;
            }
        } else {
            // Fallback to localStorage
            localStorage.setItem('userProfile', JSON.stringify(currentProfileData));
            showSuccessMessage('Perfil salvo!');
        }

        // Close modal
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function updateHeaderAvatar(profile) {
        const headerAvatar = document.getElementById('header-avatar');
        if (!headerAvatar) return;

        // Update background layer
        const bgLayer = document.getElementById('header-avatar-bg');
        if (bgLayer && profile.avatar) {
            // Apply background color/gradient
            if (profile.avatar.backgroundImage) {
                bgLayer.style.backgroundImage = `url('${profile.avatar.backgroundImage}')`;
                bgLayer.style.backgroundSize = 'cover';
                bgLayer.style.backgroundPosition = 'center';
                // Keep color as fallback
                if (profile.avatar.backgroundColor) {
                    bgLayer.style.backgroundColor = profile.avatar.backgroundColor;
                } else if (profile.avatar.gradient) {
                    bgLayer.style.background = profile.avatar.gradient;
                }
            } else if (profile.avatar.gradient) {
                bgLayer.style.background = profile.avatar.gradient;
            } else if (profile.avatar.backgroundColor) {
                bgLayer.style.backgroundColor = profile.avatar.backgroundColor;
            }
        }

        // Update character image
        const imgElement = headerAvatar.querySelector('img, .avatar-char-layer');
        if (imgElement && profile.avatar?.characterImage) {
            imgElement.src = profile.avatar.characterImage;
        }

        // Update frame layer
        const frameLayer = document.getElementById('header-avatar-frame');
        if (frameLayer && profile.avatar) {
            frameLayer.className = 'avatar-frame-layer';
            if (profile.avatar.frame) {
                frameLayer.classList.add(profile.avatar.frame);
            }
        }
    }

    function showSuccessMessage(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 100000;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Make openProfileModal globally available
    window.openProfileModal = function(profileData) {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;

        // Load profile data if provided
        if (profileData) {
            currentProfileData = {
                name: profileData.name || 'Nome',
                pronoun: profileData.pronoun || '-san',
                backgroundColor: profileData.avatar?.backgroundColor || 
                                profileData.avatar?.gradient || 
                                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundImage: profileData.avatar?.backgroundImage || null,
                characterImage: profileData.avatar?.characterImage || 'images/IMG_20250628_194234.png',
                frame: profileData.avatar?.frame || '',
                password: profileData.password || null
            };
            
            // Update form fields
            const nameInput = document.getElementById('profile-name');
            if (nameInput) nameInput.value = currentProfileData.name;
            
            const passwordInput = document.getElementById('profile-password');
            if (passwordInput) passwordInput.value = currentProfileData.password || '';
            
            // Update pronoun selection
            document.querySelectorAll('.pronoun-pill').forEach(pill => {
                pill.classList.remove('active');
                if (pill.dataset.pronoun === currentProfileData.pronoun) {
                    pill.classList.add('active');
                }
            });
            
            updatePreview();
        }

        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileModal);
    } else {
        initProfileModal();
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

})();
