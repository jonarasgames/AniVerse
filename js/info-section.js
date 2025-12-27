document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('info-search');
    const searchBtn = document.getElementById('info-search-btn');
    const infoContainer = document.getElementById('anime-info-container');
    
    // Guard against missing elements
    if (!searchBtn || !searchInput || !infoContainer) {
        console.warn('Info section elements not found, skipping info-section initialization');
        return;
    }
    
    // Exemplo de dados (substitua com dados reais)
    const animeInfoData = {
        "Attack on Titan": {
            title: "Attack on Titan",
            image: "https://raw.githubusercontent.com/jonarasgames/AniVerse/refs/heads/main/images/thumbnails/attack.png",
            synopsis: "Em um mundo onde a humanidade vive dentro de cidades cercadas por três enormes muralhas que os protegem dos gigantescos humanóides devoradores de humanos chamados de Titãs.",
            year: 2013,
            rating: 4.8,
            episodes: 75,
            status: "Concluído",
            genres: ["Ação", "Drama", "Fantasia"],
            characters: [
                { name: "Eren Yeager", role: "Protagonista", image: "https://example.com/eren.jpg" },
                { name: "Mikasa Ackerman", role: "Protagonista", image: "https://example.com/mikasa.jpg" },
                { name: "Armin Arlert", role: "Protagonista", image: "https://example.com/armin.jpg" }
            ]
        },
        // Adicione mais animes aqui
    };
    
    // Buscar informações
    searchBtn.addEventListener('click', searchAnimeInfo);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchAnimeInfo();
    });
    
    function searchAnimeInfo() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        // Simular busca (substitua com busca real)
        const anime = animeInfoData[query];
        if (anime) {
            renderAnimeInfo(anime);
        } else {
            infoContainer.innerHTML = '<p class="no-results">Nenhum anime encontrado com esse nome.</p>';
        }
    }
    
    function renderAnimeInfo(anime) {
        infoContainer.innerHTML = `
            <div class="anime-details">
                <div class="anime-poster">
                    <img src="${anime.image}" alt="${anime.title}">
                </div>
                <div class="anime-content">
                    <h2>${anime.title}</h2>
                    <div class="anime-meta-info">
                        <span class="meta-item">${anime.year}</span>
                        <span class="meta-item">${anime.rating} <i class="fas fa-star" style="color: gold;"></i></span>
                        <span class="meta-item">${anime.episodes} episódios</span>
                        <span class="meta-item">${anime.status}</span>
                    </div>
                    <div class="anime-synopsis">
                        <h3>Sinopse</h3>
                        <p>${anime.synopsis}</p>
                    </div>
                    <div class="anime-genres">
                        <h3>Gêneros</h3>
                        <div class="genre-tags">
                            ${anime.genres.map(genre => `<span class="meta-item">${genre}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            ${anime.characters ? `
            <div class="anime-characters">
                <h3>Personagens Principais</h3>
                <div class="characters-grid">
                    ${anime.characters.map(char => `
                        <div class="character-card">
                            <div class="character-img">
                                <img src="${char.image}" alt="${char.name}">
                            </div>
                            <div class="character-name">${char.name}</div>
                            <div class="character-role">${char.role}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }
});
