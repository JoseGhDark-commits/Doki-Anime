// watch.js - VERSIÓN CORREGIDA Y MEJORADA
let currentAnimeId = null;
let currentEpisodeId = null;
let episodeList = [];

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
        showError('ID de anime no especificado');
        return;
    }
    
    currentAnimeId = animeId;
    
    // Configurar botón de volver
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
    
    // Cargar episodios
    try {
        showLoading('Cargando episodios...');
        
        const response = await fetch(`${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.EPISODES}/${animeId}`);
        const data = await response.json();
        
        if (!data.success || !Array.isArray(data.results?.episodes)) {
            throw new Error('No se pudieron cargar los episodios');
        }
        
        // Normalizar usando el adaptador
        episodeList = data.results.episodes.map(window.normalizeData.episode);
        
        console.log('✅ Episodios cargados:', episodeList);
        
        if (episodeList.length === 0) {
            throw new Error('No hay episodios disponibles para este anime');
        }
        
        // Cargar primer episodio
        await loadEpisode(episodeList[0]);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showError('Error al cargar el anime: ' + error.message);
    }
});

async function loadEpisode(episode) {
    // EXTRAER EL ID REAL DEL EPISODIO (la parte después de ?ep=)
    let cleanEpisodeId = episode.id;
    if (episode.id.includes('?ep=')) {
        const parts = episode.id.split('?ep=');
        cleanEpisodeId = parts[1]; // Tomar solo el número del episodio
    }
    
    currentEpisodeId = cleanEpisodeId; // USAR EL ID LIMPIO
    
    console.log('🎬 Cargando episodio:', episode);
    console.log('🔑 ID del episodio CORREGIDO:', currentEpisodeId);
    
    // Actualizar título
    document.getElementById('episode-title').textContent = 
        `Episodio ${episode.episode_no}${episode.title ? `: ${episode.title}` : ''}`;
    
    // Mostrar loading
    document.getElementById('video-player').innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 300px; flex-direction: column; color: white;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 1rem;">Cargando servidores...</p>
        </div>
    `;
    
    // Renderizar lista
    renderEpisodeList();
    
    // Cargar servidores - CON URL CORRECTA
    try {
        const serversUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.SERVERS}/${currentAnimeId}?ep=${currentEpisodeId}`;
        console.log('📡 URL Servidores CORREGIDA:', serversUrl);
        
        const serversResponse = await fetch(serversUrl);
        const serversData = await serversResponse.json();
        
        if (!serversData.success) {
            throw new Error('Error en la respuesta de la API');
        }
        
        if (!serversData.results || serversData.results.length === 0) {
            throw new Error('No hay servidores disponibles para este episodio');
        }
        
        console.log('✅ Servidores recibidos:', serversData.results);
        
        renderServers(serversData.results);
        
        // Auto-cargar primer servidor
        if (serversData.results.length > 0) {
            const first = serversData.results[0];
            await loadVideo(first.server_id, first.type || 'sub');
        }
        
    } catch (error) {
        console.error('Error servidores:', error);
        showError('No se pudieron cargar los servidores: ' + error.message);
    }
}

async function loadVideo(serverId, type) {
    try {
        showLoading('Cargando video...');
        
        const streamUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.STREAM}?id=${currentAnimeId}&server=${serverId}&type=${type}&ep=${currentEpisodeId}`;
        
        console.log('📡 URL Stream:', streamUrl);
        
        const response = await fetch(streamUrl);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Error en la respuesta del servidor de video');
        }
        
        if (!data.results?.streamingLink?.[0]?.link?.file) {
            throw new Error('Enlace de video no disponible en este servidor');
        }
        
        const videoUrl = data.results.streamingLink[0].link.file;
        
        console.log('✅ Video URL encontrada:', videoUrl);
        
        // Crear reproductor de video
        document.getElementById('video-player').innerHTML = `
            <video class="video-player" controls autoplay playsinline style="width: 100%; max-height: 70vh; background: #000;">
                <source src="${videoUrl}" type="video/mp4">
                <source src="${videoUrl}" type="video/webm">
                Tu navegador no soporta el elemento de video.
            </video>
        `;
        
        // Configurar eventos del video
        const videoElement = document.querySelector('.video-player');
        videoElement.addEventListener('error', (e) => {
            console.error('Error en video:', e);
            showError('Error al reproducir el video. Intenta con otro servidor.');
        });
        
        videoElement.addEventListener('loadeddata', () => {
            console.log('✅ Video cargado correctamente');
            hideLoading();
        });
        
        videoElement.addEventListener('canplay', () => {
            hideLoading();
        });
        
    } catch (error) {
        console.error('Error video:', error);
        hideLoading();
        showError('Error al cargar el video: ' + error.message);
    }
}

function renderEpisodeList() {
    const container = document.querySelector('.episode-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    episodeList.forEach(ep => {
        const button = document.createElement('div');
        button.className = 'episode-item';
        if (ep.id === currentEpisodeId) button.classList.add('active');
        button.textContent = ep.episode_no || '?';
        button.onclick = () => loadEpisode(ep);
        container.appendChild(button);
    });
    
    // Configurar navegación entre episodios
    setupEpisodeNavigation();
}

function setupEpisodeNavigation() {
    const currentIndex = episodeList.findIndex(ep => ep.id === currentEpisodeId);
    const prevBtn = document.getElementById('prev-episode');
    const nextBtn = document.getElementById('next-episode');
    
    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0;
        prevBtn.onclick = () => {
            if (currentIndex > 0) {
                loadEpisode(episodeList[currentIndex - 1]);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentIndex >= episodeList.length - 1;
        nextBtn.onclick = () => {
            if (currentIndex < episodeList.length - 1) {
                loadEpisode(episodeList[currentIndex + 1]);
            }
        };
    }
}

function renderServers(servers) {
    const container = document.getElementById('server-selector');
    if (!container) return;
    
    container.innerHTML = '<h3>🎯 Servidores Disponibles</h3>';
    
    const sub = servers.filter(s => s.type === 'sub');
    const dub = servers.filter(s => s.type === 'dub');
    const other = servers.filter(s => s.type !== 'sub' && s.type !== 'dub');
    
    if (sub.length > 0) {
        container.innerHTML += '<h4>🔤 Subtitulado</h4>' + 
            sub.map(s => `
                <button onclick="loadVideo('${s.server_id}','sub')" class="server-button">
                    ${s.serverName || `Servidor ${s.server_id}`}
                </button>
            `).join('');
    }
    
    if (dub.length > 0) {
        container.innerHTML += '<h4>🎙️ Doblado</h4>' + 
            dub.map(s => `
                <button onclick="loadVideo('${s.server_id}','dub')" class="server-button">
                    ${s.serverName || `Servidor ${s.server_id}`}
                </button>
            `).join('');
    }
    
    if (other.length > 0) {
        container.innerHTML += '<h4>🔗 Otros</h4>' + 
            other.map(s => `
                <button onclick="loadVideo('${s.server_id}','${s.type}')" class="server-button">
                    ${s.serverName || `Servidor ${s.server_id}`} (${s.type})
                </button>
            `).join('');
    }
    
    // Si no hay servidores
    if (sub.length === 0 && dub.length === 0 && other.length === 0) {
        container.innerHTML += '<p style="color: #ff6b9d; text-align: center; padding: 1rem;">No hay servidores disponibles</p>';
    }
}

function showLoading(message = 'Cargando...') {
    let loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
        loading.innerHTML = `
            <div class="spinner"></div>
            <div>${message}</div>
        `;
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showError(message) {
    // Usar el contenedor de error si existe, sino crear uno
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.cssText = `
            background: #ff4444;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            text-align: center;
            display: none;
        `;
        document.querySelector('.container').prepend(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <strong>⚠️ Error:</strong> ${message}
        <button onclick="this.parentElement.style.display='none'" 
                style="margin-left: 1rem; background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">
            ×
        </button>
    `;
    errorDiv.style.display = 'block';
    
    // También mostrar en el reproductor de video
    document.getElementById('video-player').innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ff6b9d;">
            <h3>⚠️ Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" 
                    style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff6b9d; border: none; border-radius: 5px; color: white; cursor: pointer;">
                Reintentar
            </button>
        </div>
    `;
}

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rechazada:', e);
    showError('Error inesperado: ' + e.reason?.message || 'Error desconocido');
});
