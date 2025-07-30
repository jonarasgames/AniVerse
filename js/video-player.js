document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    const skipBtn = document.getElementById('skip-opening-btn');
    
    if (!videoPlayer || !skipBtn) {
        console.error("Elementos do player não encontrados!");
        return;
    }

    // Variável para armazenar os tempos da abertura
    let currentOpening = null;

    // Atualiza quando os dados da abertura mudam
    function updateOpeningData(newData) {
        currentOpening = newData;
        console.log("Dados da abertura atualizados:", currentOpening);
    }

    // Verifica se deve mostrar o botão
    function checkSkipButton() {
        if (!currentOpening) {
            skipBtn.style.display = 'none';
            return;
        }

        const currentTime = videoPlayer.currentTime;
        const { start, end } = currentOpening;
        const counter = skipBtn.querySelector('#skip-counter');

        // Mostra o botão 5s antes até o final da abertura
        if (currentTime >= start - 5 && currentTime < end) {
            const remaining = Math.ceil(end - currentTime);
            counter.textContent = remaining;
            skipBtn.style.display = 'block';
            
            // Efeito de pulsar nos últimos 10s
            skipBtn.classList.toggle('pulse', remaining <= 10);
        } else {
            skipBtn.style.display = 'none';
        }
    }

    // Função para pular a abertura
    function skipOpening() {
        if (currentOpening) {
            videoPlayer.currentTime = currentOpening.end;
            
            // Feedback visual
            const feedback = document.createElement('div');
            feedback.className = 'seek-feedback';
            feedback.textContent = 'Abertura pulada!';
            feedback.style.color = '#2ecc71';
            document.getElementById('video-player-container').appendChild(feedback);
            
            setTimeout(() => {
                feedback.classList.add('fade-out');
                setTimeout(() => feedback.remove(), 300);
            }, 1000);
        }
    }

    // Configura os eventos
    videoPlayer.addEventListener('timeupdate', checkSkipButton);
    skipBtn.addEventListener('click', skipOpening);

    // ⭐⭐ Permite atualização externa dos dados ⭐⭐
    window.updateOpeningData = updateOpeningData;
    console.log("Player de vídeo configurado com sucesso!");
});
