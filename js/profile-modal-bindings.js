/* js/profile-modal-bindings.js - restore profile modal and bindings */
(function(){
  function safe(id){ return document.getElementById(id); }
  function applyColorToAvatar(color){ const el = document.querySelector('.avatar-bg'); if(!el) return; el.style.backgroundColor = color; el.style.backgroundImage = ''; }
  function applyGradientToAvatar(grad){ const el = document.querySelector('.avatar-bg'); if(!el) return; el.style.backgroundImage = grad; el.style.backgroundColor = ''; }
  function applyFrameToAvatar(className){
    const overlay = document.querySelector('.avatar-frame-overlay');
    if (!overlay) {
      const avatar = document.querySelector('.avatar-bg');
      if (!avatar) return;
      const ov = document.createElement('div'); ov.className = 'avatar-frame-overlay'; avatar.appendChild(ov);
    }
    document.querySelectorAll('.avatar-frame-overlay').forEach(o => o.className = 'avatar-frame-overlay ' + (className || ''));
  }

  function saveProfile(profile){
    try { localStorage.setItem('userProfile', JSON.stringify(profile)); } catch(e){ console.warn(e); }
  }
  function loadProfile(){
    try { const s = localStorage.getItem('userProfile'); return s ? JSON.parse(s) : null; } catch(e){ return null; }
  }

  window.openProfileModal = function() {
    const modal = safe('profile-modal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  };

  window.bindProfileModalControls = function(){
    const modal = safe('profile-modal');
    if (!modal){
      // if missing, create a minimal modal skeleton
      const m = document.createElement('div'); m.id='profile-modal'; m.className='profile-modal'; m.innerHTML = '<div class="profile-modal-inner"><h3>Perfil</h3><div id="profile-controls"></div><button id="save-profile">Salvar</button></div>';
      document.body.appendChild(m);
    }
    
    // Bind close buttons
    const closeButtons = modal.querySelectorAll('.close-modal, .close-profile');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      });
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
    
    const saveBtn = document.getElementById('save-profile');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const profile = { name: document.getElementById('profile-name')?.value || '', pronoun: document.getElementById('selected-pronoun')?.value || '', avatarBg: document.querySelector('.avatar-bg')?.style.backgroundColor || '', avatarChar: document.querySelector('.char-option.selected')?.dataset?.char || '', avatarFrame: document.querySelector('.avatar-frame-overlay')?.className || '' };
      saveProfile(profile);
      // update header avatar if present
      const headerAvatar = document.querySelector('#header-avatar img');
      if (headerAvatar && profile.avatarChar) headerAvatar.src = profile.avatarChar;
      modal.style.display = 'none';
      document.body.style.overflow = '';
      alert('Perfil salvo.');
    });

    // apply loaded profile
    const p = loadProfile();
    if (p) {
      if (p.avatarBg) applyColorToAvatar(p.avatarBg);
      if (p.avatarFrame) applyFrameToAvatar(p.avatarFrame);
    }
    console.log('✅ Profile modal controls bound successfully');
  };
})();
