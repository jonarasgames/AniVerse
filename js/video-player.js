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
