document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    
    // Controles de teclado para o player
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('video-modal');
        if (modal.style.display === 'block') {
            switch (e.key) {
                case ' ':
                    // Espaço para play/pause
                    e.preventDefault();
                    if (videoPlayer.paused) {
                        videoPlayer.play().catch(error => {
                            console.error("Erro ao reproduzir vídeo:", error);
                            // Tentar novamente sem parâmetros se falhar
                            const currentSrc = videoPlayer.src;
                            if (currentSrc.includes('?')) {
                                videoPlayer.src = currentSrc.split('?')[0];
                                videoPlayer.play().catch(e => console.error("Erro na segunda tentativa:", e));
                            }
                        });
                    } else {
                        videoPlayer.pause();
                    }
                    break;
                case 'ArrowRight':
                    // Avançar 5 segundos
                    e.preventDefault();
                    videoPlayer.currentTime += 5;
                    break;
                case 'ArrowLeft':
                    // Retroceder 5 segundos
                    e.preventDefault();
                    videoPlayer.currentTime -= 5;
                    break;
                case 'ArrowUp':
                    // Aumentar volume
                    e.preventDefault();
                    videoPlayer.volume = Math.min(videoPlayer.volume + 0.1, 1);
                    break;
                case 'ArrowDown':
                    // Diminuir volume
                    e.preventDefault();
                    videoPlayer.volume = Math.max(videoPlayer.volume - 0.1, 0);
                    break;
                case 'f':
                    // Tela cheia
                    e.preventDefault();
                    if (videoPlayer.requestFullscreen) {
                        videoPlayer.requestFullscreen();
                    } else if (videoPlayer.webkitRequestFullscreen) {
                        videoPlayer.webkitRequestFullscreen();
                    } else if (videoPlayer.msRequestFullscreen) {
                        videoPlayer.msRequestFullscreen();
                    }
                    break;
                case 'm':
                    // Mudo
                    e.preventDefault();
                    videoPlayer.muted = !videoPlayer.muted;
                    break;
            }
        }
    });
    
    // Tratamento de erros de vídeo
    videoPlayer.addEventListener('error', function() {
        console.error("Erro ao carregar vídeo:", videoPlayer.error);
        const currentSrc = videoPlayer.src;
        
        // Tentar remover parâmetros se houver
        if (currentSrc.includes('?')) {
            const cleanSrc = currentSrc.split('?')[0];
            console.log("Tentando carregar URL limpa:", cleanSrc);
            videoPlayer.src = cleanSrc;
            videoPlayer.load();
            videoPlayer.play().catch(e => console.error("Erro ao tentar reproduzir URL limpa:", e));
        }
    });
    
    // Atualizar tempo atual do vídeo
    videoPlayer.addEventListener('timeupdate', function() {
        const modal = document.getElementById('video-modal');
        if (modal.style.display === 'block') {
            const animeId = document.querySelector('.anime-card[data-id]')?.dataset.id;
            const seasonSelect = document.getElementById('season-select');
            const episodeSelect = document.getElementById('episode-select');
            
            if (animeId && seasonSelect && episodeSelect) {
                animeDB.saveContinueWatching(
                    animeId,
                    seasonSelect.value,
                    episodeSelect.value,
                    videoPlayer.currentTime
                );
            }
        }
    });
});
