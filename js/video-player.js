class SkipButtonController {
    constructor() {
        this.player = document.getElementById('anime-player');
        this.skipBtn = document.getElementById('skip-opening-btn');
        this.currentOpening = null;
        
        if (!this.player || !this.skipBtn) {
            console.error("Elementos essenciais não encontrados!");
            return;
        }

        this.init();
    }

    init() {
        // Configuração inicial
        this.skipBtn.style.display = 'none'; // Garante estado inicial
        
        // Monitora alterações de tempo
        this.player.addEventListener('timeupdate', () => this.updateButton());
        
        // Configura o clique
        this.skipBtn.addEventListener('click', () => {
            if (this.currentOpening) {
                this.player.currentTime = this.currentOpening.end;
            }
        });

        // Interface global para receber dados
        window.updateOpeningData = (data) => {
            this.currentOpening = data?.start !== undefined ? data : null;
            console.log("Dados recebidos:", this.currentOpening);
            this.updateButton();
        };

        console.log("✅ Controle de skip configurado!");
    }

    updateButton() {
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
    document.getElementById('video-player-container').appendChild(feedback);
    setTimeout(() => feedback.remove(), 1000);
}

// Feedback de volume
function showVolumeFeedback() {
    const feedback = document.createElement('div');
    feedback.className = 'volume-feedback';
    feedback.innerHTML = `
        <i class="fas fa-volume-${videoPlayer.muted ? 'mute' : 'up'}"></i>
        <div class="volume-bar">
            <div class="volume-level" 
                 style="width: ${player.muted ? 0 : player.volume * 100}%">
            </div>
        </div>
    `;
    document.getElementById('video-player-container').appendChild(feedback);
    setTimeout(() => feedback.remove(), 1000);
}
