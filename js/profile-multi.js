/* js/profile-multi.js - Netflix-style multi-profile system */
(function() {
    'use strict';

    const STORAGE_KEY = 'aniverse_profiles';
    const ACTIVE_PROFILE_KEY = 'aniverse_active_profile';

    // Profile Manager Class
    class ProfileManager {
        constructor() {
            this.profiles = this.loadProfiles();
            this.activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
        }

        loadProfiles() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Error loading profiles:', e);
                return [];
            }
        }

        saveProfiles() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles));
            } catch (e) {
                console.error('Error saving profiles:', e);
            }
        }

        createProfile(profileData) {
            const profile = {
                id: Date.now().toString(),
                name: profileData.name || 'Usuário',
                pronoun: profileData.pronoun || '-san',
                avatar: profileData.avatar || {},
                password: profileData.password || null,
                createdAt: new Date().toISOString(),
                continueWatching: []
            };
            this.profiles.push(profile);
            this.saveProfiles();
            return profile;
        }

        updateProfile(profileId, updates) {
            const index = this.profiles.findIndex(p => p.id === profileId);
            if (index !== -1) {
                this.profiles[index] = { ...this.profiles[index], ...updates };
                this.saveProfiles();
                return this.profiles[index];
            }
            return null;
        }

        deleteProfile(profileId) {
            const index = this.profiles.findIndex(p => p.id === profileId);
            if (index !== -1) {
                this.profiles.splice(index, 1);
                this.saveProfiles();
                if (this.activeProfileId === profileId) {
                    this.activeProfileId = null;
                    localStorage.removeItem(ACTIVE_PROFILE_KEY);
                }
                return true;
            }
            return false;
        }

        getProfile(profileId) {
            return this.profiles.find(p => p.id === profileId);
        }

        getAllProfiles() {
            return this.profiles;
        }

        setActiveProfile(profileId) {
            const profile = this.getProfile(profileId);
            if (profile) {
                this.activeProfileId = profileId;
                localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
                return profile;
            }
            return null;
        }

        getActiveProfile() {
            if (this.activeProfileId) {
                return this.getProfile(this.activeProfileId);
            }
            return null;
        }

        updateContinueWatching(profileId, animeData) {
            const profile = this.getProfile(profileId);
            if (!profile) return;

            // Remove existing entry for this anime
            profile.continueWatching = profile.continueWatching.filter(
                item => item.animeId !== animeData.animeId
            );

            // Add to beginning
            profile.continueWatching.unshift({
                animeId: animeData.animeId,
                title: animeData.title,
                thumbnail: animeData.thumbnail,
                season: animeData.season,
                episode: animeData.episode,
                progress: animeData.progress || 0,
                timestamp: new Date().toISOString()
            });

            // Keep only last 20 items
            profile.continueWatching = profile.continueWatching.slice(0, 20);
            
            this.saveProfiles();
        }
    }

    // Initialize profile manager
    const profileManager = new ProfileManager();
    window.profileManager = profileManager;

    // Profile Selection Screen
    function showProfileSelectionScreen() {
        const profiles = profileManager.getAllProfiles();
        
        // Create overlay
        let overlay = document.getElementById('profile-selection-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'profile-selection-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.innerHTML = '';
        }

        const container = document.createElement('div');
        container.style.cssText = `
            max-width: 1200px;
            width: 90%;
            text-align: center;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Quem está assistindo?';
        title.style.cssText = `
            color: white;
            font-size: 3rem;
            margin-bottom: 2rem;
            font-weight: 300;
        `;
        container.appendChild(title);

        const profilesGrid = document.createElement('div');
        profilesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 150px));
            gap: 1.5rem;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto 2rem auto;
        `;

        // Add existing profiles
        profiles.forEach(profile => {
            const profileCard = createProfileCard(profile, () => {
                profileManager.setActiveProfile(profile.id);
                hideProfileSelectionScreen();
                loadProfileData(profile);
            });
            profilesGrid.appendChild(profileCard);
        });

        // Add "Add Profile" card
        if (profiles.length < 5) {
            const addCard = createAddProfileCard();
            profilesGrid.appendChild(addCard);
        }

        container.appendChild(profilesGrid);

        const manageButton = document.createElement('button');
        manageButton.textContent = 'Gerenciar Perfis';
        manageButton.style.cssText = `
            background: transparent;
            border: 1px solid #808080;
            color: #808080;
            padding: 12px 30px;
            font-size: 16px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            margin-top: 1rem;
        `;
        manageButton.addEventListener('mouseenter', () => {
            manageButton.style.borderColor = 'white';
            manageButton.style.color = 'white';
        });
        manageButton.addEventListener('mouseleave', () => {
            manageButton.style.borderColor = '#808080';
            manageButton.style.color = '#808080';
        });
        manageButton.addEventListener('click', showManageProfilesScreen);
        container.appendChild(manageButton);

        overlay.appendChild(container);
        overlay.style.display = 'flex';
    }

    function createProfileCard(profile, onClick) {
        const card = document.createElement('div');
        card.style.cssText = `
            cursor: pointer;
            transition: transform 0.3s;
            text-align: center;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.1)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1)';
        });
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-card-overlay')) {
                // If profile has password, ask for it
                if (profile.password) {
                    const inputPassword = prompt(`Digite a senha para ${profile.name}${profile.pronoun}:`);
                    if (inputPassword !== profile.password) {
                        alert('Senha incorreta! ❌');
                        return;
                    }
                }
                onClick();
            }
        });

        const avatarContainer = document.createElement('div');
        avatarContainer.style.cssText = `
            width: 150px;
            height: 150px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 1rem;
            background: ${profile.avatar?.backgroundColor || '#ff6b6b'};
            ${profile.avatar?.backgroundImage ? `background-image: url('${profile.avatar.backgroundImage}');` : ''}
            ${profile.avatar?.gradient ? `background: ${profile.avatar.gradient};` : ''}
            background-size: cover;
            background-position: center;
            position: relative;
            border: 3px solid transparent;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;

        if (profile.avatar?.characterImage) {
            const charImg = document.createElement('img');
            charImg.src = profile.avatar.characterImage;
            charImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            avatarContainer.appendChild(charImg);
        }

        card.appendChild(avatarContainer);

        const nameLabel = document.createElement('div');
        nameLabel.textContent = profile.name + profile.pronoun;
        nameLabel.style.cssText = `
            color: #808080;
            font-size: 1.2rem;
            transition: color 0.3s;
        `;
        card.addEventListener('mouseenter', () => {
            nameLabel.style.color = 'white';
        });
        card.addEventListener('mouseleave', () => {
            nameLabel.style.color = '#808080';
        });
        card.appendChild(nameLabel);

        // Add continue watching preview
        if (profile.continueWatching && profile.continueWatching.length > 0) {
            const preview = document.createElement('div');
            preview.style.cssText = `
                display: flex;
                gap: 4px;
                margin-top: 8px;
                justify-content: center;
                flex-wrap: wrap;
                max-width: 150px;
            `;
            
            profile.continueWatching.slice(0, 3).forEach(anime => {
                const thumb = document.createElement('img');
                thumb.src = anime.thumbnail;
                thumb.style.cssText = `
                    width: 50px;
                    height: 30px;
                    object-fit: cover;
                    border-radius: 2px;
                `;
                preview.appendChild(thumb);
            });
            
            card.appendChild(preview);
        }

        return card;
    }

    function createAddProfileCard() {
        const card = document.createElement('div');
        card.style.cssText = `
            cursor: pointer;
            transition: transform 0.3s;
            text-align: center;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.1)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1)';
        });
        card.addEventListener('click', () => {
            openProfileCreationModal(true); // true = hide selection screen after
        });

        const avatarContainer = document.createElement('div');
        avatarContainer.style.cssText = `
            width: 150px;
            height: 150px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 1rem;
            background: #2a2a2a;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #808080;
        `;

        const plusIcon = document.createElement('div');
        plusIcon.textContent = '+';
        plusIcon.style.cssText = `
            font-size: 5rem;
            color: #808080;
        `;
        avatarContainer.appendChild(plusIcon);
        card.appendChild(avatarContainer);

        const nameLabel = document.createElement('div');
        nameLabel.textContent = 'Adicionar Perfil';
        nameLabel.style.cssText = `
            color: #808080;
            font-size: 1.2rem;
        `;
        card.appendChild(nameLabel);

        return card;
    }

    function hideProfileSelectionScreen() {
        const overlay = document.getElementById('profile-selection-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    function openProfileCreationModal(hideSelectionScreen = false) {
        if (hideSelectionScreen) {
            hideProfileSelectionScreen();
        }
        
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Clear editing mode
            delete modal.dataset.editingProfileId;
            
            // Reset form
            const nameInput = document.getElementById('profile-name');
            if (nameInput) nameInput.value = '';
            
            // Clear previous selections
            document.querySelectorAll('.bg-option, .char-option, .gradient-option, .frame-option').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Set defaults
            const firstBg = document.querySelector('.bg-option');
            if (firstBg) firstBg.classList.add('selected');
            
            const firstChar = document.querySelector('.char-option');
            if (firstChar) firstChar.classList.add('selected');
            
            // Reset button text
            const saveBtn = document.getElementById('save-profile');
            if (saveBtn) {
                saveBtn.textContent = 'Salvar Perfil';
            }
        }
    }

    function openProfileEditModal(profile) {
        const modal = document.getElementById('profile-modal');
        if (!modal || !profile) return;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Store current profile being edited
        modal.dataset.editingProfileId = profile.id;
        
        // Fill form with profile data
        const nameInput = document.getElementById('profile-name');
        if (nameInput) nameInput.value = profile.name;
        
        const passwordInput = document.getElementById('profile-password');
        if (passwordInput) passwordInput.value = profile.password || '';
        
        const pronounSelect = document.getElementById('selected-pronoun');
        if (pronounSelect) pronounSelect.value = profile.pronoun || '-san';
        
        // Update pronoun pills
        document.querySelectorAll('.pronoun-pill').forEach(pill => {
            pill.classList.remove('active');
            if (pill.dataset.pronoun === (profile.pronoun || '-san')) {
                pill.classList.add('active');
            }
        });
        
        // Clear all selections first
        document.querySelectorAll('.color-option, .character-option, .bg-image-option, .frame-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select the correct color/gradient option
        if (profile.avatar?.backgroundColor || profile.avatar?.gradient) {
            const targetValue = profile.avatar.gradient || profile.avatar.backgroundColor;
            const colorOption = Array.from(document.querySelectorAll('.color-option')).find(
                el => el.dataset.value === targetValue
            );
            if (colorOption) colorOption.classList.add('selected');
        }
        
        // Select the correct background image
        if (profile.avatar?.backgroundImage) {
            const bgImageOption = Array.from(document.querySelectorAll('.bg-image-option')).find(
                el => el.dataset.src === profile.avatar.backgroundImage
            );
            if (bgImageOption) bgImageOption.classList.add('selected');
        }
        
        // Select the correct character image
        if (profile.avatar?.characterImage) {
            const charOption = Array.from(document.querySelectorAll('.character-option')).find(
                el => {
                    const img = el.querySelector('img');
                    return img && img.src === profile.avatar.characterImage;
                }
            );
            if (charOption) charOption.classList.add('selected');
        }
        
        // Select the correct frame
        if (profile.avatar?.frame) {
            const frameOption = Array.from(document.querySelectorAll('.frame-option')).find(
                el => el.dataset.frame === profile.avatar.frame
            );
            if (frameOption) frameOption.classList.add('selected');
        }
        
        // Update save button to "Salvar Alterações"
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.textContent = '💾 Salvar Alterações';
        }
    }

    function showManageProfilesScreen() {
        const profiles = profileManager.getAllProfiles();
        
        let overlay = document.getElementById('profile-selection-overlay');
        if (!overlay) return;
        
        overlay.innerHTML = '';

        const container = document.createElement('div');
        container.style.cssText = `
            max-width: 1200px;
            width: 90%;
            text-align: center;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Gerenciar Perfis';
        title.style.cssText = `
            color: white;
            font-size: 3rem;
            margin-bottom: 2rem;
            font-weight: 300;
        `;
        container.appendChild(title);

        const profilesGrid = document.createElement('div');
        profilesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 150px));
            gap: 1.5rem;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto 2rem auto;
        `;

        profiles.forEach(profile => {
            const manageCard = createManageProfileCard(profile);
            profilesGrid.appendChild(manageCard);
        });

        container.appendChild(profilesGrid);

        const doneButton = document.createElement('button');
        doneButton.textContent = 'Concluído';
        doneButton.style.cssText = `
            background: white;
            border: none;
            color: #1a1a2e;
            padding: 12px 40px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 4px;
            margin-top: 1rem;
        `;
        doneButton.addEventListener('click', showProfileSelectionScreen);
        container.appendChild(doneButton);

        overlay.appendChild(container);
    }

    function createManageProfileCard(profile) {
        const card = document.createElement('div');
        card.style.cssText = `
            position: relative;
            text-align: center;
        `;

        const avatarContainer = document.createElement('div');
        avatarContainer.style.cssText = `
            width: 150px;
            height: 150px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 1rem;
            background: ${profile.avatar?.backgroundColor || '#ff6b6b'};
            ${profile.avatar?.backgroundImage ? `background-image: url('${profile.avatar.backgroundImage}');` : ''}
            ${profile.avatar?.gradient ? `background: ${profile.avatar.gradient};` : ''}
            background-size: cover;
            background-position: center;
            position: relative;
        `;

        if (profile.avatar?.characterImage) {
            const charImg = document.createElement('img');
            charImg.src = profile.avatar.characterImage;
            charImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            avatarContainer.appendChild(charImg);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 1px solid white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Deseja deletar o perfil "${profile.name}${profile.pronoun}"?`)) {
                profileManager.deleteProfile(profile.id);
                showManageProfilesScreen();
            }
        });
        avatarContainer.appendChild(deleteBtn);

        card.appendChild(avatarContainer);

        const nameLabel = document.createElement('div');
        nameLabel.textContent = profile.name + profile.pronoun;
        nameLabel.style.cssText = `
            color: white;
            font-size: 1.2rem;
        `;
        card.appendChild(nameLabel);

        return card;
    }

    function loadProfileData(profile) {
        // Update header avatar
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar) {
            headerAvatar.style.display = 'flex';
            headerAvatar.style.width = '40px';
            headerAvatar.style.height = '40px';
            headerAvatar.style.borderRadius = '50%';
            headerAvatar.style.cursor = 'pointer';
            headerAvatar.style.background = profile.avatar?.gradient || profile.avatar?.backgroundColor || '#ff6b6b';
            
            const img = headerAvatar.querySelector('img');
            if (img && profile.avatar?.characterImage) {
                img.src = profile.avatar.characterImage;
                img.style.display = 'block';
            } else if (img) {
                img.style.display = 'none';
            }
            
            headerAvatar.onclick = () => {
                // FOTO DE PERFIL → SELEÇÃO DE USUÁRIOS
                const profiles = profileManager.getAllProfiles();
                if (profiles.length > 1) {
                    showProfileSelectionScreen();
                } else {
                    if (confirm('Você só tem 1 perfil. Deseja criar um novo?')) {
                        openProfileCreationModal();
                    }
                }
            };
            
            headerAvatar.title = `${profile.name}${profile.pronoun} - Clique para trocar`;
        }

        // Update welcome message - NOME DO PERFIL → EDIÇÃO
        const welcomeContainer = document.getElementById('user-welcome-container');
        if (welcomeContainer) {
            welcomeContainer.innerHTML = `
                <h2 style="color: var(--text-color); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.3s;" 
                    id="profile-name-edit-btn"
                    onmouseover="this.style.color='var(--primary-color)'"
                    onmouseout="this.style.color='var(--text-color)'"
                    title="Clique para editar seu perfil">
                    Bem-vindo de volta, ${profile.name}${profile.pronoun}! ✏️
                </h2>
            `;
            
            const editBtn = document.getElementById('profile-name-edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    openProfileEditModal(profile);
                });
            }
        }

        // Load profile's continue watching
        if (profile.continueWatching && profile.continueWatching.length > 0) {
            // Helper function to create continue watching card
            function createContinueWatchingCard(item) {
                const card = document.createElement('div');
                card.className = 'anime-card';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <div class="anime-thumbnail">
                        <img src="${item.thumbnail}" alt="${item.title}">
                        ${item.progress ? `<div class="progress-bar" style="width: ${item.progress}%"></div>` : ''}
                    </div>
                    <div class="anime-info">
                        <h3 class="anime-title">${item.title}</h3>
                        <p>T${item.season} E${item.episode}</p>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    const anime = window.animeDB?.animes.find(a => a.id === item.animeId);
                    if (anime && window.openEpisode) {
                        window.openEpisode(anime, item.season, item.episode - 1);
                    }
                });
                
                return card;
            }
            
            // Populate both continue watching grids
            const grids = ['continue-watching-grid', 'continue-grid'];
            grids.forEach(gridId => {
                const grid = document.getElementById(gridId);
                if (grid) {
                    grid.innerHTML = '';
                    profile.continueWatching.forEach(item => {
                        grid.appendChild(createContinueWatchingCard(item));
                    });
                }
            });
        } else {
            // If no history, clear grids
            const grids = ['continue-watching-grid', 'continue-grid'];
            grids.forEach(gridId => {
                const grid = document.getElementById(gridId);
                if (grid) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Nenhum anime em progresso ainda.</p>';
                }
            });
        }

        // Show login button as "profile" button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${profile.name}`;
            loginBtn.onclick = showProfileSelectionScreen;
        }
    }

    // Check on page load
    function init() {
        const profiles = profileManager.getAllProfiles();
        const activeProfile = profileManager.getActiveProfile();
        
        if (profiles.length === 0) {
            // No profiles, show profile creation
            openProfileCreationModal();
            return;
        }
        
        if (profiles.length === 1 && !activeProfile) {
            // Only one profile and no active profile, auto-select it
            profileManager.setActiveProfile(profiles[0].id);
            loadProfileData(profiles[0]);
            return;
        }
        
        if (profiles.length > 1 && !activeProfile) {
            // Multiple profiles but no active profile, show selection screen
            showProfileSelectionScreen();
            return;
        }
        
        if (activeProfile) {
            // Active profile exists, load it
            loadProfileData(activeProfile);
        }

        // Integrate with existing profile save button
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.onclick = function(e) {
                const modal = document.getElementById('profile-modal');
                const nameInput = document.getElementById('profile-name');
                const pronounInput = document.getElementById('selected-pronoun');
                const passwordInput = document.getElementById('profile-password');
                
                if (!nameInput || !nameInput.value.trim()) {
                    alert('Por favor, digite um nome para o perfil.');
                    return;
                }

                // Collect avatar data
                const avatarData = {
                    backgroundColor: null,
                    gradient: null,
                    backgroundImage: null,
                    characterImage: null,
                    frame: null
                };

                const selectedColor = document.querySelector('.color-option.selected');
                if (selectedColor) {
                    const value = selectedColor.dataset.value;
                    if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
                        avatarData.gradient = value;
                    } else {
                        avatarData.backgroundColor = value;
                    }
                }

                const selectedBgImage = document.querySelector('.bg-image-option.selected');
                if (selectedBgImage) {
                    avatarData.backgroundImage = selectedBgImage.dataset.src;
                }

                const selectedChar = document.querySelector('.character-option.selected img');
                if (selectedChar) {
                    avatarData.characterImage = selectedChar.src;
                }

                const selectedFrame = document.querySelector('.frame-option.selected');
                if (selectedFrame) {
                    avatarData.frame = selectedFrame.dataset.frame;
                }

                const profileData = {
                    name: nameInput.value.trim(),
                    pronoun: pronounInput ? pronounInput.value : '-san',
                    avatar: avatarData,
                    password: passwordInput ? (passwordInput.value.trim() || null) : null
                };

                // Check if we're editing an existing profile
                const editingProfileId = modal?.dataset.editingProfileId;
                
                if (editingProfileId) {
                    // Update existing profile
                    profileManager.updateProfile(editingProfileId, profileData);
                    
                    // Close modal
                    if (modal) {
                        modal.style.display = 'none';
                        delete modal.dataset.editingProfileId;
                        document.body.style.overflow = '';
                    }
                    
                    // Reload current profile
                    const updatedProfile = profileManager.getProfile(editingProfileId);
                    loadProfileData(updatedProfile);
                    alert('Perfil atualizado com sucesso! ✅');
                } else {
                    // Create new profile
                    const newProfile = profileManager.createProfile(profileData);
                    profileManager.setActiveProfile(newProfile.id);
                    
                    // Close modal
                    if (modal) {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }

                    // Load new profile immediately
                    loadProfileData(newProfile);
                    
                    // Hide profile selection screen if open
                    hideProfileSelectionScreen();
                    
                    alert('Perfil criado com sucesso! 🎉');
                }
                
                // Reset button text
                saveBtn.textContent = '💾 Salvar Perfil';
            };
        }

        // Add profile switch button to header
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn && profiles.length > 0) {
            const activeProfile = profileManager.getActiveProfile();
            if (activeProfile) {
                loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${activeProfile.name}`;
                loginBtn.onclick = showProfileSelectionScreen;
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions
    window.showProfileSelectionScreen = showProfileSelectionScreen;
    window.hideProfileSelectionScreen = hideProfileSelectionScreen;
})();
