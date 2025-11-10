// script.js - Funcionalidad principal con configuración centralizada

// Importar configuración (si usas módulos)
import { API_CONFIG } from './api-config.js';



// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Doki Doki Anime...');
    initSearchBar();
    initMobileMenu();
    loadHomeContent();
});

// ===== BUSCADOR MEJORADO =====

function initSearchBar() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search-btn');

    if (searchButton && searchInput) {
        // Búsqueda al hacer clic
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value.trim());
        });

        // Búsqueda al presionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value.trim());
            }
        });

        // Sugerencias en tiempo real
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

// Realizar búsqueda
async function performSearch(query) {
    if (!query || query.length < 2) {
        alert('Por favor, ingresa al menos 2 caracteres para buscar');
        return;
    }

    try {
        showLoading('🔍 Buscando anime...');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}?keyword=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.results) {
            throw new Error('No se encontraron resultados');
        }

        hideLoading();
        displaySearchResults(data.results, query);
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        hideLoading();
        showError('Error al buscar anime. Por favor, intenta de nuevo.');
    }
}

// Mostrar sugerencias de búsqueda
async function showSearchSuggestions(query) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH_SUGGEST}?keyword=${encodeURIComponent(query)}`);
        
        if (!response.ok) return;

        const data = await response.json();
        
        if (!data.success || !data.results || data.results.length === 0) {
            return;
        }

        // Aquí puedes implementar un dropdown de sugerencias
        console.log('Sugerencias:', data.results.slice(0, 5));
        
    } catch (error) {
        console.error('Error en sugerencias:', error);
    }
}

// Mostrar resultados de búsqueda
function displaySearchResults(results, query) {
    // Redirigir a browse.html con parámetros de búsqueda
    window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
}

// ===== CONTENIDO DEL HOME OPTIMIZADO =====

async function loadHomeContent() {
    try {
        showLoading('Cargando contenido...');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOME}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar contenido del home');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Error en respuesta de la API');
        }

        const results = data.results;
        
        // Cargar secciones si existen
        if (results.trending) {
            loadSection('topSearches', results.trending, '🔥 Top Búsquedas');
        }
        
        if (results.mostPopular) {
            loadSection('popularAnime', results.mostPopular, '⭐ Más Populares');
        }
        
        if (results.topAiring) {
            loadSection('airingAnime', results.topAiring, '📺 En Emisión');
        }
        
        if (results.latestEpisode) {
            loadSection('moviesAnime', results.latestEpisode, '🎬 Últimos Episodios');
        }

        hideLoading();
        
    } catch (error) {
        console.error('Error al cargar contenido:', error);
        hideLoading();
        showError('Error al cargar el contenido principal');
    }
}

// Cargar sección de contenido
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

    section.innerHTML = animes.slice(0, 12).map(anime => `
        <div class="anime-card" onclick="goToAnime('${anime.id}', '${anime.title.replace(/'/g, "\\'")}')">
            <img src="${anime.poster || 'https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image'}" 
                 alt="${anime.title}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image'">
            <span class="status-badge">${anime.tvInfo?.showType || 'Anime'}</span>
            <div class="anime-info">
                <div class="anime-title" title="${anime.title}">${anime.title}</div>
                <div class="anime-meta">
                    <span class="rating">⭐ ${anime.tvInfo?.rating || '8.0'}</span>
                    <span>${anime.tvInfo?.eps || '?'} EP</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== NAVEGACIÓN =====

function goToAnime(animeId, animeTitle) {
    window.location.href = `watch.html?id=${animeId}&name=${encodeURIComponent(animeTitle)}`;
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

        // Cerrar menú al hacer clic en un enlace
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.style.display = 'none';
            });
        });
    }
}

// ===== UTILIDADES MEJORADAS =====

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
    // Puedes implementar un sistema de notificaciones más elegante
    console.error('Error:', message);
    alert(message); // Temporal - mejorar con UI propia
}
