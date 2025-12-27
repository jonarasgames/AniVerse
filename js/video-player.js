class SkipButtonController {
    constructor() {
        this.player = document.getElementById('anime-player');
        this.skipBtn = document.getElementById('skip-opening-btn');
        this.currentOpening = null;
        
        if (!this.player || !this.skipBtn) {
            console.warn("SkipButtonController: Elementos não encontrados, funcionalidade desabilitada");
            return;
        }

        this.init();
    }

    init() {
        // Configuração inicial
        if (this.skipBtn) this.skipBtn.style.display = 'none';
        
        // Monitora alterações de tempo
        if (this.player) {
            this.player.addEventListener('timeupdate', () => this.updateButton());
        }
        
        // Configura o clique
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => {
                if (this.currentOpening && this.player) {
                    this.player.currentTime = this.currentOpening.end;
                }
            });
        }

        // Interface global para receber dados
        window.updateOpeningData = (data) => {
            this.currentOpening = data?.start !== undefined ? data : null;
            window.currentOpeningData = this.currentOpening;
            this.updateButton();
        };

        // Expose current opening data
        window.currentOpeningData = null;

        console.log("✅ Controle de skip configurado!");
    }

    updateButton() {
        if (!this.skipBtn || !this.player) return;
        
        if (!this.currentOpening) {
            this.skipBtn.style.display = 'none';
            return;
        }

        const currentTime = this.player.currentTime;
        const { start, end } = this.currentOpening;

        // Mostra apenas durante a abertura
        const shouldShow = currentTime >= start && currentTime < end;
        
        this.skipBtn.style.display = shouldShow ? 'block' : 'none';
        
        if (shouldShow) {
            const remaining = Math.ceil(end - currentTime);
            this.skipBtn.innerHTML = `⏩ Pular (${remaining}s)`;
        }
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new SkipButtonController();
});

// Controles por teclado
document.addEventListener('keydown', (e) => {
    const player = document.getElementById('anime-player');
    if (!player || document.activeElement.tagName === 'INPUT') return;

    // Evita comportamento padrão
    e.preventDefault();
    
    switch(e.key.toLowerCase()) {
        case ' ':
            // Espaço: Play/Pause
            player.paused ? player.play() : player.pause();
            break;
            
        case 'm':
            // M: Mute
            player.muted = !player.muted;
            break;
            
        case 'f':
            // F: Tela cheia
            if (!document.fullscreenElement) {
                player.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
            break;
            
        case 'arrowright':
            // →: Avança 5 segundos
            player.currentTime += 5;
            showSeekFeedback('+5s');
            break;
            
        case 'arrowleft':
            // ←: Retrocede 5 segundos
            player.currentTime = Math.max(0, player.currentTime - 5);
            showSeekFeedback('-5s');
            break;
            
        case 'arrowup':
            // ↑: Aumenta volume (+10%)
            player.volume = Math.min(1, player.volume + 0.1);
            showVolumeFeedback();
            break;
            
        case 'arrowdown':
            // ↓: Diminui volume (-10%)
            player.volume = Math.max(0, player.volume - 0.1);
            showVolumeFeedback();
            break;
            
        case 'k':
            // K: Frame a frame (avanço manual)
            frameStep(player, 1);
            break;
            
        case 'j':
            // J: Frame a frame (retrocesso)
            frameStep(player, -1);
            break;
            
        case 's':
            // S: Skip de abertura (se disponível)
            if (window.currentOpeningData) {
                player.currentTime = window.currentOpeningData.end;
                showSeekFeedback('Abertura pulada!');
            }
            break;
    }
});

// Função para avanço frame a frame
function frameStep(player, direction) {
    const frameTime = 1/30; // 30fps
    player.pause();
    player.currentTime += (frameTime * direction);
}

// Feedback visual
function showSeekFeedback(message) {
    const container = document.getElementById('video-player-container');
    const player = document.getElementById('anime-player');
    if (!container && !player) {
        console.warn('showSeekFeedback: No container found');
        return;
    }
    
    const feedback = document.createElement('div');
    feedback.className = 'player-feedback';
    feedback.textContent = message;
    feedback.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 1.2rem;
    `;
    
    const target = container || player.parentElement || document.body;
    target.appendChild(feedback);
    setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
    }, 1000);
}

// Feedback de volume
function showVolumeFeedback() {
    const container = document.getElementById('video-player-container');
    const player = document.getElementById('anime-player');
    if (!container && !player) {
        console.warn('showVolumeFeedback: No container found');
        return;
    }
    
    // Check if player is actually a video element
    const isVideo = player instanceof HTMLVideoElement || player instanceof HTMLAudioElement;
    
    const feedback = document.createElement('div');
    feedback.className = 'volume-feedback';
    feedback.innerHTML = `
        <i class="fas fa-volume-${isVideo && player.muted ? 'mute' : 'up'}"></i>
        <div class="volume-bar">
            <div class="volume-level" 
                 style="width: ${isVideo && !player.muted ? player.volume * 100 : 0}%">
            </div>
        </div>
    `;
    
    const target = container || (player && player.parentElement) || document.body;
    target.appendChild(feedback);
    setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
    }, 1000);
}

// Custom Video Controls
document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('anime-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const timeline = document.querySelector('.timeline-container');
    const timelineProgress = document.getElementById('timeline-progress');
    const timeDisplay = document.getElementById('time-display');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeContainer = document.querySelector('.volume-container');
    const volumeProgress = document.getElementById('volume-progress');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const pipBtn = document.getElementById('pip-btn');
    
    if (!player) return;
    
    // Play/Pause
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
        });
    }
    
    // Update play/pause icon
    player.addEventListener('play', () => {
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    });
    
    player.addEventListener('pause', () => {
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // Timeline
    player.addEventListener('timeupdate', () => {
        if (!timeline || !timelineProgress || !timeDisplay) return;
        
        const percent = (player.currentTime / player.duration) * 100;
        timelineProgress.style.width = percent + '%';
        
        const currentMin = Math.floor(player.currentTime / 60);
        const currentSec = Math.floor(player.currentTime % 60);
        const durationMin = Math.floor(player.duration / 60);
        const durationSec = Math.floor(player.duration % 60);
        
        timeDisplay.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
    });
    
    if (timeline) {
        timeline.addEventListener('click', (e) => {
            const rect = timeline.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            player.currentTime = percent * player.duration;
        });
    }
    
    // Volume
    if (volumeBtn) {
        volumeBtn.addEventListener('click', () => {
            player.muted = !player.muted;
            volumeBtn.innerHTML = player.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            if (volumeProgress) {
                volumeProgress.style.width = player.muted ? '0%' : (player.volume * 100) + '%';
            }
        });
    }
    
    if (volumeContainer) {
        volumeContainer.addEventListener('click', (e) => {
            const rect = volumeContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            player.volume = percent;
            player.muted = false;
            if (volumeProgress) {
                volumeProgress.style.width = (percent * 100) + '%';
            }
            if (volumeBtn) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
    }
    
    // Fullscreen
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('video-player-container');
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                }
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // Picture-in-Picture
    if (pipBtn) {
        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (player.requestPictureInPicture) {
                    await player.requestPictureInPicture();
                } else {
                    // Fallback: create mini player
                    const miniPlayer = document.createElement('div');
                    miniPlayer.id = 'mini-player';
                    miniPlayer.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 320px;
                        height: 180px;
                        z-index: 10000;
                        background: black;
                        border: 2px solid white;
                        border-radius: 8px;
                        overflow: hidden;
                    `;
                    const clonedPlayer = player.cloneNode(true);
                    clonedPlayer.style.width = '100%';
                    clonedPlayer.style.height = '100%';
                    clonedPlayer.currentTime = player.currentTime;
                    miniPlayer.appendChild(clonedPlayer);
                    document.body.appendChild(miniPlayer);
                    
                    // Close button
                    const closeBtn = document.createElement('button');
                    closeBtn.innerHTML = '&times;';
                    closeBtn.style.cssText = `
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: rgba(0,0,0,0.5);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 25px;
                        height: 25px;
                        cursor: pointer;
                    `;
                    closeBtn.addEventListener('click', () => miniPlayer.remove());
                    miniPlayer.appendChild(closeBtn);
                }
            } catch (error) {
                console.error('PiP error:', error);
            }
        });
    }
});
