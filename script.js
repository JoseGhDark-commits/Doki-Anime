
// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Doki Doki Anime...');
    initSearchBar();
    initMobileMenu();
    loadHomeContent();
});

// ===== BUSCADOR =====

function initSearchBar() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search-btn');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value.trim());
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value.trim());
            }
        });

        // Sugerencias
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    showSearchSuggestions(query);
                }, 300);
            }
        });
    }
}

async function performSearch(query) {
    if (!query || query.length < 2) {
        alert('Por favor, ingresa al menos 2 caracteres para buscar');
        return;
    }
    
    // Redirigir a browse con el parámetro de búsqueda
    window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
}

async function showSearchSuggestions(query) {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH_SUGGEST}?keyword=${encodeURIComponent(query)}`
        );
        
        if (!response.ok) return;

        const data = await response.json();
        
        if (!data.success || !data.results?.length) return;

        console.log('Sugerencias:', data.results.slice(0, 5));
        // Aquí puedes implementar un dropdown visual
        
    } catch (error) {
        console.error('Error en sugerencias:', error);
    }
}

// ===== CONTENIDO DEL HOME =====

async function loadHomeContent() {
    try {
        showLoading('Cargando contenido...');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOME}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Error en respuesta de la API');
        }

        const results = data.results;
        
        // Cargar cada sección
        loadSection('topSearches', results.trending || [], '🔥 Top Búsquedas');
        loadSection('popularAnime', results.mostPopular || [], '⭐ Más Populares');
        loadSection('airingAnime', results.topAiring || [], '📺 En Emisión');
        loadSection('moviesAnime', results.latestEpisode || [], '🎬 Últimos Episodios');

        hideLoading();
        
    } catch (error) {
        console.error('Error al cargar contenido:', error);
        hideLoading();
        showError('Error al cargar el contenido principal');
    }
}

function loadSection(sectionId, animes, title) {
    const section = document.getElementById(sectionId);
    if (!section) {
        console.warn(`Sección ${sectionId} no encontrada`);
        return;
    }

    if (!animes || animes.length === 0) {
        section.innerHTML = `<div class="loading-container"><p>No hay contenido disponible</p></div>`;
        return;
    }

    section.innerHTML = animes.slice(0, 12).map(anime => {
        const title = anime.title || anime.name || 'Sin título';
        const poster = anime.poster || 'https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image';
        const rating = anime.tvInfo?.['MAL Score'] || anime.tvInfo?.rating || '8.0';
        const type = anime.tvInfo?.showType || 'TV';
        const episodes = anime.tvInfo?.eps || anime.tvInfo?.sub || '?';

        return `
            <div class="anime-card" onclick="goToAnime('${anime.id}', '${title.replace(/'/g, "\\'")}')">
                <img src="${poster}" 
                     alt="${title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image'">
                <span class="status-badge">${type}</span>
                <div class="anime-info">
                    <div class="anime-title" title="${title}">${title}</div>
                    <div class="anime-meta">
                        <span class="rating">⭐ ${rating}</span>
                        <span>${episodes} EP</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== NAVEGACIÓN =====

function goToAnime(animeId, animeTitle) {
    window.location.href = `watch.html?id=${encodeURIComponent(animeId)}`;
}

// ===== MENÚ MÓVIL =====

function initMobileMenu() {
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

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.style.display = 'none';
            });
        });
    }
}

// ===== UTILIDADES =====

function showLoading(message = 'Cargando...') {
    let loading = document.getElementById('loading-overlay');
    
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-size: 1.2rem;
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(loading);
    }

    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <div style="margin-top: 1rem;">${message}</div>
    `;
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showError(message) {
    console.error('Error:', message);
    // Crear un toast notification en lugar de alert
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #ff4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}
