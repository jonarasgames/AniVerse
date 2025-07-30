document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('anime-player');
    const skipBtn = document.getElementById('skip-opening-btn');
    
    if (!videoPlayer || !skipBtn) {
        console.error("❌ Elementos essenciais não encontrados!");
        return;
    }

    // Estado global
    let currentOpening = null;

    // Função principal de atualização
    const updateSkipButton = () => {
        if (!currentOpening) {
            skipBtn.style.display = 'none';
            return;
        }

        const currentTime = videoPlayer.currentTime;
        const { start, end } = currentOpening;

        // Lógica adaptada para aberturas no 0s
        const shouldShow = (start === 0 && currentTime < end) || 
                         (start > 0 && currentTime >= start - 5 && currentTime < end);

        if (shouldShow) {
            const remaining = Math.ceil(end - currentTime);
            skipBtn.innerHTML = `⏩ Pular abertura (<span id="skip-counter">${remaining}</span>s)`;
            skipBtn.style.display = 'block';
            
            // Efeito visual nos últimos 10s
            skipBtn.classList.toggle('pulse', remaining <= 10);
        } else {
            skipBtn.style.display = 'none';
        }
    };

    // Configura eventos
    videoPlayer.addEventListener('timeupdate', updateSkipButton);
    videoPlayer.addEventListener('play', updateSkipButton); // Atualiza ao play
    videoPlayer.addEventListener('seeking', updateSkipButton); // Atualiza ao buscar

    // Ação de pular
    skipBtn.addEventListener('click', () => {
        if (currentOpening) {
            videoPlayer.currentTime = currentOpening.end;
            // Feedback visual
            const feedback = document.createElement('div');
            feedback.textContent = "⏩ Abertura pulada!";
            feedback.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: #2ecc71;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1000;
                font-size: 1.2rem;
            `;
            videoPlayer.parentElement.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1000);
        }
    });

    // Interface global para receber dados
    window.updateOpeningData = (data) => {
        currentOpening = data;
        console.log("📊 Dados da abertura recebidos:", data);
        updateSkipButton(); // Força atualização imediata
    };

    console.log("✅ Player configurado com sucesso!");
});
