// browse.js - 100% ESTÁTICO, VARIABLES GLOBALES
// NO USAR export/import, usa window.API_CONFIG

// Estado global
window.currentFilters = {
    genre: '',
    type: '',
    sort: 'most-popular',
    search: ''
};
window.currentPage = 1;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📂 Inicializando browse.js...');
    console.log('⚙️ API_CONFIG:', window.API_CONFIG);
    
    initFromURL();
    loadAnime(1);
    
    // Event listeners (ELIMINA onclick del HTML)
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Menú móvil
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            const isVisible = navMenu.style.display === 'flex';
            navMenu.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible) {
                navMenu.style.position = 'absolute';
                navMenu.style.top = '100%';
                navMenu.style.left = '0';
                navMenu.style.right = '0';
                navMenu.style.background = 'var(--card-bg)';
                navMenu.style.flexDirection = 'column';
                navMenu.style.padding = '1rem';
                navMenu.style.gap = '1rem';
                navMenu.style.zIndex = '999';
                navMenu.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
            }
        });
    }
});

// ===== FUNCIONES CORE =====

async function fetchFromAPI(endpoint) {
    try {
        const url = `${window.API_CONFIG.BASE_URL}${endpoint}`;
        console.log('🔗 Fetching:', url);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Error fetching ${endpoint}:`, error);
        return null;
    }
}

function normalizeAnimeData(anime) {
    return {
        id: anime.id || anime.data_id || '',
        title: anime.title || anime.name || 'Sin título',
        image: anime.poster || 'https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image',
        rating: anime.tvInfo?.['MAL Score'] || anime.tvInfo?.rating || 8.0,
        status: anime.tvInfo?.showType || 'Serie',
        type: anime.tvInfo?.showType || 'TV',
        episodes: anime.tvInfo?.eps || anime.tvInfo?.sub || 0
    };
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    
    const normalized = normalizeAnimeData(anime);
    if (!normalized.id) {
        console.warn('⚠️ Anime sin ID:', anime);
        return card;
    }
    
    card.innerHTML = `
        <img src="${normalized.image}" 
             alt="${normalized.title}" 
             loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image'">
        <span class="status-badge">${normalized.status}</span>
        <div class="anime-info">
            <div class="anime-title" title="${normalized.title}">${normalized.title}</div>
            <div class="anime-meta">
                <span class="rating">⭐ ${normalized.rating.toFixed(1)}</span>
                <span>${normalized.episodes} EP</span>
            </div>
        </div>
    `;
    
    card.style.cursor = 'pointer';
    card.onclick = () => {
        window.location.href = `watch.html?id=${encodeURIComponent(normalized.id)}`;
    };
    
    return card;
}

async function loadAnime(page = 1) {
    const grid = document.getElementById('animeGrid');
    const resultsCount = document.getElementById('resultsCount');
    const currentPageEl = document.getElementById('currentPage');
    
    console.log('🔄 Cargando página:', page);
    console.log('🎛️ Filtros:', window.currentFilters);
    
    // Loading
    grid.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div>Cargando anime...</div>
        </div>
    `;
    
    try {
        let endpoint = '';
        const filters = window.currentFilters;
        
        // Determinar endpoint
        if (filters.search) {
            endpoint = `${window.API_CONFIG.ENDPOINTS.SEARCH}?keyword=${encodeURIComponent(filters.search)}`;
        } else if (filters.genre) {
            endpoint = `/api/genre/${filters.genre}?page=${page}`;
        } else if (filters.type && !filters.sort) {
            endpoint = `/api/${filters.type}?page=${page}`;
        } else {
            switch(filters.sort) {
                case 'most-popular': endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.POPULAR}?page=${page}`; break;
                case 'recently-added': endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.RECENT}?page=${page}`; break;
                case 'recently-updated': endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.UPDATED}?page=${page}`; break;
                case 'top-airing': endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.AIRING}?page=${page}`; break;
                case 'most-favorite': endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.FAVORITE}?page=${page}`; break;
                default: endpoint = `${window.API_CONFIG.ENDPOINTS.CATEGORIES.POPULAR}?page=${page}`;
            }
        }
        
        const data = await fetchFromAPI(endpoint);
        
        if (!data || !data.success) {
            throw new Error('No se pudieron cargar los datos');
        }
        
        let animeList = [];
        let totalPages = 1;
        
        if (filters.search) {
            animeList = data.results || [];
            totalPages = 1;
        } else {
            animeList = data.results.data || data.results || [];
            totalPages = data.results.totalPages || 10;
        }
        
        grid.innerHTML = '';
        
        if (animeList.length === 0) {
            grid.innerHTML = `
                <div class="loading-container" style="grid-column: 1/-1;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">😢</div>
                    <div>No se encontraron resultados</div>
                </div>
            `;
            resultsCount.innerHTML = `<strong>📊 0 resultados</strong>`;
            currentPageEl.innerHTML = `<strong>📄 Página 1</strong>`;
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        
        // Renderizar tarjetas
        animeList.forEach(anime => {
            grid.appendChild(createAnimeCard(anime));
        });
        
        resultsCount.innerHTML = `<strong>📊 ${animeList.length} resultados encontrados</strong>`;
        currentPageEl.innerHTML = `<strong>📄 Página ${page} de ${totalPages}</strong>`;
        
        if (!filters.search) {
            createPagination(page, totalPages);
        } else {
            document.getElementById('pagination').innerHTML = '';
        }
        
    } catch (error) {
        console.error('❌ Error loadAnime:', error);
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1/-1;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <div>Error al cargar el contenido</div>
            </div>
        `;
    }
}

function createPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            loadAnime(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    pagination.appendChild(prevBtn);
    
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
            loadAnime(i);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        pagination.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            loadAnime(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    pagination.appendChild(nextBtn);
}

function applyFilters() {
    window.currentFilters = {
        genre: document.getElementById('genreFilter').value,
        type: document.getElementById('typeFilter').value,
        sort: document.getElementById('sortFilter').value,
        search: ''
    };
    
    window.currentPage = 1;
    loadAnime(1);
}

function clearFilters() {
    document.getElementById('genreFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('sortFilter').value = 'most-popular';
    
    window.currentFilters = {
        genre: '',
        type: '',
        sort: 'most-popular',
        search: ''
    };
    
    window.currentPage = 1;
    loadAnime(1);
}

function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    const titles = {
        'movie': { title: 'Películas de Anime', desc: 'Descubre las mejores películas de anime' },
        'tv': { title: 'Series de Anime', desc: 'Explora series de anime completas' },
        'most-popular': { title: 'Anime Más Populares', desc: 'Los animes más vistos y populares' },
        'top-airing': { title: 'Top En Emisión', desc: 'Los mejores animes actualmente en emisión' },
        'search': { title: 'Resultados de Búsqueda', desc: `Resultados para "${search}"` }
    };
    
    if (search) {
        window.currentFilters.search = search;
        document.getElementById('pageTitle').textContent = titles.search?.title || 'Búsqueda';
        document.getElementById('pageDescription').textContent = titles.search?.desc || `Resultados para "${search}"`;
        document.querySelector('.filters-section').style.display = 'none';
        return;
    }
    
    if (category && titles[category]) {
        document.getElementById('pageTitle').textContent = titles[category].title;
        document.getElementById('pageDescription').textContent = titles[category].desc;
        
        switch(category) {
            case 'movie':
                document.getElementById('typeFilter').value = 'movie';
                window.currentFilters.type = 'movie';
                break;
            case 'tv':
                document.getElementById('typeFilter').value = 'tv';
                window.currentFilters.type = 'tv';
                break;
            case 'most-popular':
                window.currentFilters.sort = 'most-popular';
                break;
            case 'top-airing':
                window.currentFilters.sort = 'top-airing';
                break;
        }
    }
}
