import { API_CONFIG } from './api-config.js';

// Estado actual
let currentFilters = {
    genre: '',
    type: '',
    status: '',
    sort: 'most-popular',
    search: ''
};
let currentPage = 1;

// Función para hacer peticiones a la API
async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
}

// Normalizar datos de anime
function normalizeAnimeData(anime) {
    if (!anime) return null;
    
    return {
        id: anime.id || '',
        title: anime.title || anime.name || 'Sin título',
        image: anime.poster || 'https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image',
        rating: anime.tvInfo?.rating || 8.0,
        status: anime.tvInfo?.showType || 'Serie',
        type: anime.tvInfo?.showType || 'TV',
        episodes: anime.tvInfo?.sub || anime.tvInfo?.eps || 0
    };
}

// Crear tarjeta de anime
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    
    const normalizedAnime = normalizeAnimeData(anime);
    if (!normalizedAnime) return card;
    
    const rating = typeof normalizedAnime.rating === 'number' ? normalizedAnime.rating.toFixed(1) : '8.0';
    const episodes = normalizedAnime.episodes || 0;
    
    card.innerHTML = `
        <img src="${normalizedAnime.image}" 
             alt="${normalizedAnime.title}" 
             loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image'">
        <span class="status-badge">${normalizedAnime.status}</span>
        <div class="anime-info">
            <div class="anime-title" title="${normalizedAnime.title}">${normalizedAnime.title}</div>
            <div class="anime-meta">
                <span class="rating">⭐ ${rating}</span>
                <span>${episodes} EP</span>
            </div>
        </div>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        window.location.href = `watch.html?id=${normalizedAnime.id}`;
    });
    
    return card;
}

// Cargar anime con soporte para búsqueda, categoría y filtros
async function loadAnime(page = 1) {
    const grid = document.getElementById('animeGrid');
    const resultsCount = document.getElementById('resultsCount');
    const currentPageEl = document.getElementById('currentPage');
    
    // Mostrar loading
    grid.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div>Cargando anime...</div>
        </div>
    `;
    
    try {
        let endpoint = '';
        const filters = currentFilters;
        
        // PRIORIDAD: Búsqueda primero
        if (filters.search) {
            endpoint = `${API_CONFIG.ENDPOINTS.SEARCH}?keyword=${encodeURIComponent(filters.search)}`;
        }
        // Segunda prioridad: Género
        else if (filters.genre) {
            endpoint = `/api/genre/${filters.genre}?page=${page}`;
        }
        // Tercera prioridad: Tipo (movie, tv)
        else if (filters.type && !filters.status) {
            endpoint = `/api/${filters.type}?page=${page}`;
        }
        // Cuarta prioridad: Estado/sort
        else {
            switch(filters.sort) {
                case 'most-popular':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.POPULAR}?page=${page}`;
                    break;
                case 'recently-added':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.RECENT}?page=${page}`;
                    break;
                case 'recently-updated':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.UPDATED}?page=${page}`;
                    break;
                case 'top-airing':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.AIRING}?page=${page}`;
                    break;
                case 'most-favorite':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.FAVORITE}?page=${page}`;
                    break;
                case 'completed':
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.COMPLETED}?page=${page}`;
                    break;
                default:
                    endpoint = `${API_CONFIG.ENDPOINTS.CATEGORIES.POPULAR}?page=${page}`;
            }
        }
        
        console.log('Fetching:', endpoint);
        const data = await fetchFromAPI(endpoint);
        
        if (data && data.success) {
            // Manejar diferentes estructuras de respuesta
            let animeList = [];
            let totalPages = 1;
            
            if (filters.search) {
                // Búsqueda devuelve array directo
                animeList = data.results || [];
                totalPages = 1; // Búsqueda no tiene paginación
            } else {
                // Categorías devuelven objeto con data y totalPages
                animeList = data.results.data || data.results || [];
                totalPages = data.results.totalPages || 10;
            }
            
            // Limpiar grid
            grid.innerHTML = '';
            
            if (animeList.length === 0) {
                grid.innerHTML = `
                    <div class="loading-container" style="grid-column: 1/-1;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">😢</div>
                        <div>No se encontraron resultados${filters.search ? ` para "${filters.search}"` : ''}</div>
                    </div>
                `;
                resultsCount.innerHTML = `<strong>📊 0 resultados</strong>`;
                currentPageEl.innerHTML = `<strong>📄 Página 1</strong>`;
                document.getElementById('pagination').innerHTML = '';
                return;
            }
            
            // Crear tarjetas
            animeList.forEach(anime => {
                grid.appendChild(createAnimeCard(anime));
            });
            
            // Actualizar info
            resultsCount.innerHTML = `<strong>📊 ${animeList.length} resultados encontrados</strong>`;
            currentPageEl.innerHTML = `<strong>📄 Página ${page} de ${totalPages}</strong>`;
            
            // Crear paginación solo si no es búsqueda
            if (!filters.search) {
                createPagination(page, totalPages);
            } else {
                document.getElementById('pagination').innerHTML = '';
            }
            
        } else {
            throw new Error('No se pudieron cargar los datos');
        }
        
    } catch (error) {
        console.error('Error loading anime:', error);
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1/-1;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <div>Error al cargar el contenido</div>
                <button onclick="loadAnime(${page})" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Crear paginación
function createPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // Botón anterior
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
    
    // Páginas
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
    
    // Botón siguiente
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            loadAnime(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' );
        }
    };
    pagination.appendChild(nextBtn);
}

// Aplicar filtros
function applyFilters() {
    currentFilters = {
        genre: document.getElementById('genreFilter').value,
        type: document.getElementById('typeFilter').value,
        status: document.getElementById('statusFilter').value,
        sort: document.getElementById('sortFilter').value,
        search: '' // Limpiar búsqueda al aplicar filtros
    };
    
    currentPage = 1;
    loadAnime(1);
}

// Limpiar filtros
function clearFilters() {
    document.getElementById('genreFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('sortFilter').value = 'most-popular';
    
    currentFilters = {
        genre: '',
        type: '',
        status: '',
        sort: 'most-popular',
        search: ''
    };
    
    currentPage = 1;
    loadAnime(1);
}

// Inicializar desde URL params
function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    // TITULOS Y DESCRIPCIONES
    const titles = {
        'movie': { title: 'Películas de Anime', desc: 'Descubre las mejores películas de anime' },
        'tv': { title: 'Series de Anime', desc: 'Explora series de anime completas' },
        'most-popular': { title: 'Anime Más Populares', desc: 'Los animes más vistos y populares' },
        'top-airing': { title: 'Top En Emisión', desc: 'Los mejores animes actualmente en emisión' },
        'search': { title: 'Resultados de Búsqueda', desc: `Resultados para "${search}"` }
    };
    
    // Manejar búsqueda primero
    if (search) {
        currentFilters.search = search;
        document.getElementById('pageTitle').textContent = titles.search?.title || 'Búsqueda';
        document.getElementById('pageDescription').textContent = titles.search?.desc || `Resultados para "${search}"`;
        // Ocultar filtros en búsqueda
        document.querySelector('.filters-section').style.display = 'none';
        return;
    }
    
    // Manejar categorías
    if (category && titles[category]) {
        document.getElementById('pageTitle').textContent = titles[category].title;
        document.getElementById('pageDescription').textContent = titles[category].desc;
        
        switch(category) {
            case 'movie':
                document.getElementById('typeFilter').value = 'movie';
                currentFilters.type = 'movie';
                break;
            case 'tv':
                document.getElementById('typeFilter').value = 'tv';
                currentFilters.type = 'tv';
                break;
            case 'most-popular':
                document.getElementById('sortFilter').value = 'most-popular';
                currentFilters.sort = 'most-popular';
                break;
            case 'top-airing':
                document.getElementById('statusFilter').value = 'top-airing';
                currentFilters.status = 'top-airing';
                break;
        }
    }
}

// Mobile menu toggle
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando página de exploración...');
    initFromURL();
    loadAnime(1);
});
