document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    
    // Configurar cabeçalhos para requisições de vídeo
    videoPlayer.addEventListener('loadstart', function() {
        if (this.src.includes('4nm-cdn-0483964.com')) {
            this.setAttribute('crossorigin', 'anonymous');
        }
    });

    // Controles de teclado
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('video-modal');
        if (modal.style.display === 'block') {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    videoPlayer.currentTime += 5;
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    videoPlayer.currentTime -= 5;
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    videoPlayer.volume = Math.min(videoPlayer.volume + 0.1, 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    videoPlayer.volume = Math.max(videoPlayer.volume - 0.1, 0);
                    break;
                case 'f':
                    e.preventDefault();
                    videoPlayer.requestFullscreen?.() || 
                    videoPlayer.webkitRequestFullscreen?.() || 
                    videoPlayer.msRequestFullscreen?.();
                    break;
                case 'm':
                    e.preventDefault();
                    videoPlayer.muted = !videoPlayer.muted;
                    break;
            }
        }
    });
    
    // Tratamento de erros
    videoPlayer.addEventListener('error', function() {
        console.error("Erro no player de vídeo:", this.error);
    });
    
    // Atualizar progresso
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
