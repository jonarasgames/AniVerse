document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('anime-player');
    const modal = document.getElementById('video-modal');
    
    // Controles de teclado para o player
    document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'block') {
            // Verificar se o foco está em um input/textarea
            const activeElement = document.activeElement;
            const isTextInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
            
            if (isTextInput) return;
            
            switch (e.key) {
                case ' ':
                    // Espaço para play/pause
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowRight':
                    // Avançar 5 segundos
                    e.preventDefault();
                    seekVideo(5);
                    break;
                case 'ArrowLeft':
                    // Retroceder 5 segundos
                    e.preventDefault();
                    seekVideo(-5);
                    break;
                case 'ArrowUp':
                    // Aumentar volume
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    // Diminuir volume
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
                case 'f':
                    // Tela cheia
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    // Mudo
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'Escape':
                    // Sair do fullscreen
                    if (document.fullscreenElement) {
                        e.preventDefault();
                        document.exitFullscreen();
                    }
                    break;
            }
        }
    });

    // Função para play/pause
    function togglePlayPause() {
        if (videoPlayer.paused) {
            videoPlayer.play().catch(e => {
                console.error("Erro ao reproduzir:", e);
                showVideoError("Erro ao reproduzir o vídeo");
            });
        } else {
            videoPlayer.pause();
        }
    }

    // Função para avançar/retroceder
    function seekVideo(seconds) {
        videoPlayer.currentTime += seconds;
        
        // Mostrar feedback visual
        const seekFeedback = document.createElement('div');
        seekFeedback.className = 'seek-feedback';
        seekFeedback.textContent = seconds > 0 ? `+${seconds}s` : `${seconds}s`;
        seekFeedback.style.color = seconds > 0 ? '#2ecc71' : '#e74c3c';
        
        const container = document.getElementById('video-player-container');
        container.appendChild(seekFeedback);
        
        setTimeout(() => {
            seekFeedback.classList.add('fade-out');
            setTimeout(() => seekFeedback.remove(), 300);
        }, 300);
    }

    // Função para ajustar volume
    function adjustVolume(change) {
        videoPlayer.volume = Math.min(Math.max(videoPlayer.volume + change, 0), 1);
        showVolumeFeedback();
    }

    // Função para feedback visual do volume
    function showVolumeFeedback() {
        const volumeFeedback = document.createElement('div');
        volumeFeedback.className = 'volume-feedback';
        
        const volumeLevel = Math.round(videoPlayer.volume * 10);
        volumeFeedback.innerHTML = `
            <i class="fas ${videoPlayer.muted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
            <div class="volume-bar">
                <div class="volume-level" style="width: ${videoPlayer.muted ? 0 : volumeLevel * 10}%"></div>
            </div>
        `;
        
        const container = document.getElementById('video-player-container');
        container.appendChild(volumeFeedback);
        
        setTimeout(() => {
            volumeFeedback.classList.add('fade-out');
            setTimeout(() => volumeFeedback.remove(), 300);
        }, 1000);
    }

    // Função para tela cheia
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (videoPlayer.requestFullscreen) {
                videoPlayer.requestFullscreen();
            } else if (videoPlayer.webkitRequestFullscreen) {
                videoPlayer.webkitRequestFullscreen();
            } else if (videoPlayer.msRequestFullscreen) {
                videoPlayer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // Função para mute/unmute
    function toggleMute() {
        videoPlayer.muted = !videoPlayer.muted;
        showVolumeFeedback();
    }

    // Atualizar tempo atual do vídeo
    videoPlayer.addEventListener('timeupdate', function() {
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

    // Tratamento de erros do vídeo
    videoPlayer.addEventListener('error', function() {
        console.error("Erro no player de vídeo:", videoPlayer.error);
        
        let errorMessage = "Erro ao carregar o vídeo";
        switch(videoPlayer.error.code) {
            case 1:
                errorMessage = "Vídeo cancelado";
                break;
            case 2:
                errorMessage = "Erro de rede";
                break;
            case 3:
                errorMessage = "Erro ao decodificar vídeo";
                break;
            case 4:
                errorMessage = "Vídeo não suportado";
                break;
        }
        
        showVideoError(errorMessage);
    });

    // Mostrar mensagem de erro
    function showVideoError(message) {
        const container = document.getElementById('video-player-container');
        let errorElement = container.querySelector('.video-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'video-error';
            container.appendChild(errorElement);
        }
        
        errorElement.innerHTML = `
            <p><i class="fas fa-exclamation-triangle"></i> ${message}</p>
            ${videoPlayer.src.includes('signature=') ? 
              '<p class="expired-warning">Links protegidos podem expirar ou requerer autenticação</p>' : ''}
            <button id="try-reload-btn" class="btn btn-primary">
                <i class="fas fa-sync-alt"></i> Tentar novamente
            </button>
        `;
        
        document.getElementById('try-reload-btn').addEventListener('click', function() {
            videoPlayer.load();
            videoPlayer.play().catch(e => console.error("Erro ao tentar novamente:", e));
            errorElement.remove();
        });
    }

    // Verificar se o link expirou quando o modal é aberto
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            videoPlayer.pause();
        }
    });

    // Atualizar controles quando entrar/sair do fullscreen
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('msfullscreenchange', updateFullscreenButton);

    function updateFullscreenButton() {
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = document.fullscreenElement ? 
                '<i class="fas fa-compress"></i>' : 
                '<i class="fas fa-expand"></i>';
        }
    }

    // Adicionar controles customizados
    function addCustomControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'custom-video-controls';
        controlsContainer.innerHTML = `
            <button class="control-btn play-pause-btn">
                <i class="fas fa-play"></i>
            </button>
            <div class="time-controls">
                <span class="current-time">00:00</span>
                <input type="range" class="seek-slider" min="0" max="100" value="0">
                <span class="duration">00:00</span>
            </div>
            <button class="control-btn volume-btn">
                <i class="fas fa-volume-up"></i>
                <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="${videoPlayer.volume}">
            </button>
            <button class="control-btn fullscreen-btn">
                <i class="fas fa-expand"></i>
            </button>
        `;
        
        const playerContainer = document.getElementById('video-player-container');
        playerContainer.appendChild(controlsContainer);

        // Event listeners para controles customizados
        document.querySelector('.play-pause-btn').addEventListener('click', togglePlayPause);
        document.querySelector('.fullscreen-btn').addEventListener('click', toggleFullscreen);
        
        const volumeSlider = document.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', function() {
            videoPlayer.volume = this.value;
            videoPlayer.muted = this.value == 0;
        });
        
        const seekSlider = document.querySelector('.seek-slider');
        seekSlider.addEventListener('input', function() {
            const seekTo = videoPlayer.duration * (this.value / 100);
            videoPlayer.currentTime = seekTo;
        });
        
        // Atualizar controles
        videoPlayer.addEventListener('play', function() {
            document.querySelector('.play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        });
        
        videoPlayer.addEventListener('pause', function() {
            document.querySelector('.play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        });
        
        videoPlayer.addEventListener('volumechange', function() {
            volumeSlider.value = videoPlayer.volume;
            document.querySelector('.volume-btn i').className = 
                videoPlayer.muted || videoPlayer.volume == 0 ? 
                'fas fa-volume-mute' : 
                videoPlayer.volume > 0.5 ? 
                'fas fa-volume-up' : 
                'fas fa-volume-down';
        });
        
        videoPlayer.addEventListener('timeupdate', function() {
            const currentMinutes = Math.floor(videoPlayer.currentTime / 60);
            const currentSeconds = Math.floor(videoPlayer.currentTime % 60);
            document.querySelector('.current-time').textContent = 
                `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
            
            seekSlider.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        });
        
        videoPlayer.addEventListener('loadedmetadata', function() {
            const durationMinutes = Math.floor(videoPlayer.duration / 60);
            const durationSeconds = Math.floor(videoPlayer.duration % 60);
            document.querySelector('.duration').textContent = 
                `${durationMinutes}:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`;
        });
    }

    // Inicializar controles customizados
    addCustomControls();

    // Adicione estas funções ao seu video-player.js

    // Variável global para armazenar os dados da abertura
    let currentOpeningData = null;

    // Função para verificar se deve mostrar o botão de pular
    function checkSkipOpeningButton() {
        const videoPlayer = document.getElementById('anime-player');
        const skipBtn = document.getElementById('skip-opening-btn');
        const counter = skipBtn.querySelector('.skip-counter');

        if (!currentOpeningData || !videoPlayer) return;

        const currentTime = videoPlayer.currentTime;
        const { start, end } = currentOpeningData;

        // Mostrar botão 5 segundos antes da abertura começar
        if (currentTime >= start - 5 && currentTime < end) {
            const remaining = Math.ceil(end - currentTime);
            counter.textContent = remaining;

            skipBtn.style.display = 'block';

            // Efeito de pulsação nos últimos 10 segundos
            if (remaining <= 10) {
                skipBtn.classList.add('pulse');
            } else {
                skipBtn.classList.remove('pulse');
            }
        } else {
            skipBtn.style.display = 'none';
            skipBtn.classList.remove('pulse');
        }
    }

    // Função para pular a abertura
    function skipOpening() {
        const videoPlayer = document.getElementById('anime-player');
        if (currentOpeningData && videoPlayer) {
            videoPlayer.currentTime = currentOpeningData.end;

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

    // Atualize o evento que carrega um novo episódio
    function loadEpisode(episodeData) {
        // ... seu código existente ...

        // Armazene os dados da abertura
        currentOpeningData = episodeData.opening || null;

        // Configure o listener para verificar o botão
        videoPlayer.addEventListener('timeupdate', checkSkipOpeningButton);

        // ... continue com o resto do seu código ...
    }

    // Adicione o evento de clique ao botão
    document.getElementById('skip-opening-btn').addEventListener('click', skipOpening);
});
