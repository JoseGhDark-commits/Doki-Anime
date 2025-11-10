// browse.js - FUNCIÓN loadAnime CORREGIDA
// browse.js - FUNCIÓN fetchFromAPI CORREGIDA
async function fetchFromAPI(endpoint) {
    try {
        const url = `${window.API_CONFIG.BASE_URL}${endpoint}`;
        console.log('🔗 Fetching:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // VALIDACIÓN DE ESTRUCTURA
        if (!data) {
            throw new Error('Respuesta vacía de la API');
        }
        
        console.log('✅ Respuesta API:', data);
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching ${endpoint}:`, error);
        return null;
    }
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
        // Determinar endpoint
        let endpoint = '';
        const filters = window.currentFilters;
        const isSearch = Boolean(filters.search);
        
        if (isSearch) {
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
        
        console.log('🔗 Fetching:', endpoint);
        const data = await fetchFromAPI(endpoint);
        
        if (!data || !data.success) {
            throw new Error('No se pudieron cargar los datos');
        }
        
        // ===== SOLUCIÓN CLAVE: NORMALIZAR SIEMPRE A ARRAY =====
        let animeList = [];
        let totalPages = 1;
        
        console.log('📦 Respuesta cruda de la API:', data.results);
        
        if (isSearch) {
            // Búsqueda: puede devolver array directo u objeto con "data"
            const results = data.results;
            
            // Si es array, usarlo directamente
            if (Array.isArray(results)) {
                animeList = results;
                totalPages = 1;
            } 
            // Si es objeto con "data", extraerlo
            else if (results && Array.isArray(results.data)) {
                animeList = results.data;
                totalPages = results.totalPages || 1;
            } 
            // Si es otro formato, intentar encontrar array
            else {
                // Buscar cualquier propiedad que sea array
                for (let key in results) {
                    if (Array.isArray(results[key])) {
                        animeList = results[key];
                        break;
                    }
                }
                if (animeList.length === 0) {
                    animeList = []; // Vacío si no encuentra nada
                }
                totalPages = 1;
            }
        } else {
            // Categorías: formato estándar
            animeList = data.results.data || data.results || [];
            totalPages = data.results.totalPages || 10;
        }
        
        console.log('📊 animeList final (debe ser array):', animeList);
        console.log('📄 Es array?', Array.isArray(animeList));
        
        // VALIDACIÓN DEFENSIVA
        if (!Array.isArray(animeList)) {
            console.error('❌ CRÍTICO: animeList NO es un array:', animeList);
            throw new Error('Formato de datos inválido de la API');
        }
        
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
        
        // Renderizar tarjetas
        animeList.forEach(anime => {
            grid.appendChild(createAnimeCard(anime));
        });
        
        resultsCount.innerHTML = `<strong>📊 ${animeList.length} resultados encontrados</strong>`;
        currentPageEl.innerHTML = `<strong>📄 Página ${page} de ${totalPages}</strong>`;
        
        if (!isSearch) {
            createPagination(page, totalPages);
        } else {
            document.getElementById('pagination').innerHTML = '';
        }
        
    } catch (error) {
        console.error('❌ Error loadAnime:', error);
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1/-1;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <div>Error al cargar el contenido: ${error.message}</div>
                <button onclick="loadAnime(${page})" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}
