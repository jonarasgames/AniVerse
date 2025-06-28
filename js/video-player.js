document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    
    // Controles de teclado para o player
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('video-modal');
        if (modal.style.display === 'block') {
            switch (e.key) {
                case ' ':
                    // Espaço para play/pause
                    if (videoPlayer.paused) {
                        videoPlayer.play();
                    } else {
                        videoPlayer.pause();
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    // Avançar 5 segundos
                    videoPlayer.currentTime += 5;
                    break;
                case 'ArrowLeft':
                    // Retroceder 5 segundos
                    videoPlayer.currentTime -= 5;
                    break;
                case 'ArrowUp':
                    // Aumentar volume
                    videoPlayer.volume = Math.min(videoPlayer.volume + 0.1, 1);
                    break;
                case 'ArrowDown':
                    // Diminuir volume
                    videoPlayer.volume = Math.max(videoPlayer.volume - 0.1, 0);
                    break;
                case 'f':
                    // Tela cheia
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
                    videoPlayer.muted = !videoPlayer.muted;
                    break;
            }
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
    
    // Pausar vídeos de trailer quando o modal é aberto
    document.getElementById('video-modal').addEventListener('click', function() {
        document.querySelectorAll('.anime-trailer').forEach(iframe => {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        });
    });
});
