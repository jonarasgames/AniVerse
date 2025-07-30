class VideoPlayerController {
    constructor() {
        this.player = null;
        this.skipBtn = null;
        this.currentOpening = null;
        this.init();
    }

    init() {
        // Espera os elementos existirem no DOM
        const checkElements = setInterval(() => {
            this.player = document.getElementById('anime-player');
            this.skipBtn = document.getElementById('skip-opening-btn');
            
            if (this.player && this.skipBtn) {
                clearInterval(checkElements);
                this.setupEvents();
                console.log("🎬 Player inicializado com sucesso!");
            }
        }, 100);
    }

    setupEvents() {
        // Atualização em tempo real
        this.player.addEventListener('timeupdate', () => this.updateSkipButton());
        
        // Garante atualização em todos os estados
        ['play', 'seeking', 'loadedmetadata'].forEach(event => {
            this.player.addEventListener(event, () => this.updateSkipButton());
        });

        // Botão de skip
        this.skipBtn.addEventListener('click', () => {
            if (this.currentOpening) {
                this.player.currentTime = this.currentOpening.end;
                this.showFeedback();
            }
        });

        // Interface global
        window.updateOpeningData = (data) => {
            this.currentOpening = data;
            console.log("📊 Dados recebidos:", data);
            this.updateSkipButton();
        };
    }

    updateSkipButton() {
        if (!this.currentOpening || this.player.paused) {
            this.skipBtn.style.display = 'none';
            return;
        }

        const currentTime = this.player.currentTime;
        const { start, end } = this.currentOpening;

        // Lógica adaptada para qualquer cenário
        const shouldShow = (start === 0 && currentTime < end) || 
                         (currentTime >= start - 3 && currentTime < end);

        this.skipBtn.style.display = shouldShow ? 'block' : 'none';
        
        if (shouldShow) {
            const remaining = Math.ceil(end - currentTime);
            this.skipBtn.innerHTML = `⏩ Pular (${remaining}s)`;
            this.skipBtn.classList.toggle('pulse', remaining <= 10);
        }
    }

    showFeedback() {
        const feedback = document.createElement('div');
        feedback.textContent = "Abertura pulada!";
        feedback.className = 'skip-feedback';
        this.player.parentElement.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }
}

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new VideoPlayerController();
});
