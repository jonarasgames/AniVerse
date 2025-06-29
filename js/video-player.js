document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    
    // Controles de teclado para o player
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('video-modal');
        if (modal.style.display === 'block') {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (videoPlayer.paused) {
                        videoPlayer.play().catch(e => {
                            console.log("Play bloqueado:", e);
                        });
                    } else {
                        videoPlayer.pause();
                    }
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
                    if (videoPlayer.requestFullscreen) {
                        videoPlayer.requestFullscreen();
                    } else if (videoPlayer.webkitRequestFullscreen) {
                        videoPlayer.webkitRequestFullscreen();
                    } else if (videoPlayer.msRequestFullscreen) {
                        videoPlayer.msRequestFullscreen();
                    }
                    break;
                case 'm':
                    e.preventDefault();
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

    // Tratamento de erros
    videoPlayer.addEventListener('error', function() {
        console.error("Erro no vídeo:", videoPlayer.error);
        const errorContainer = document.createElement('div');
        errorContainer.className = 'video-error';
        errorContainer.innerHTML = `
            <p>Erro ao carregar o vídeo (${videoPlayer.error.code})</p>
            <p>O vídeo pode estar indisponível ou o link expirou.</p>
            <button id="try-reload-btn" class="btn btn-primary">Tentar novamente</button>
        `;
        
        const container = document.getElementById('video-player-container');
        container.appendChild(errorContainer);
        
        document.getElementById('try-reload-btn').addEventListener('click', function() {
            videoPlayer.load();
            errorContainer.remove();
        });
    });
});
