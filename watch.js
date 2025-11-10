// watch.js - VERSIÓN FINAL CON SUBTÍTULOS FUNCIONALES
let currentAnimeId = null;
let currentEpisodeId = null;
let episodeList = [];
let currentTextTracks = [];

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
        showError('ID de anime no especificado');
        return;
    }
    
    currentAnimeId = animeId;
    
    // Botón volver
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
    
    try {
        showLoading('Cargando episodios...');
        
        const response = await fetch(`${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.EPISODES}/${animeId}`);
        const data = await response.json();
        
        if (!data.success || !Array.isArray(data.results?.episodes)) {
            throw new Error('No se pudieron cargar los episodios');
        }
        
        episodeList = data.results.episodes.map(window.normalizeData.episode);
        
        if (episodeList.length === 0) {
            throw new Error('No hay episodios disponibles');
        }
        
        await loadEpisode(episodeList[0]);
        hideLoading();
        
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showError('Error: ' + error.message);
    }
});

async function loadEpisode(episode) {
    // Extraer ID limpio
    let cleanEpisodeId = episode.id;
    if (episode.id.includes('?ep=')) {
        cleanEpisodeId = episode.id.split('?ep=')[1];
    }
    
    currentEpisodeId = cleanEpisodeId;
    
    // Actualizar títulos
    document.getElementById('episode-title').textContent = 
        `Episodio ${episode.episode_no}${episode.title ? `: ${episode.title}` : ''}`;
    
    // Mostrar loading en el reproductor
    document.getElementById('video-player').innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Cargando servidores...</p>
        </div>
    `;
    
    renderEpisodeList();
    
    try {
        const serversUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.SERVERS}/${currentAnimeId}?ep=${currentEpisodeId}`;
        const serversResponse = await fetch(serversUrl);
        const serversData = await serversResponse.json();
        
        if (!serversData.success || !serversData.results?.length) {
            throw new Error('No hay servidores disponibles');
        }
        
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
        const response = await fetch(streamUrl);
        const data = await response.json();
        
        if (!data.success) throw new Error('Error en la respuesta del servidor');
        
        const streamData = data.results?.streamingLink?.[0];
        if (!streamData?.link?.file) throw new Error('Enlace de video no disponible');
        
        const videoUrl = streamData.link.file;
        const tracks = streamData.tracks || [];
        
        console.log('✅ Video:', videoUrl);
        console.log('📝 Subtítulos:', tracks);
        
        // Crear reproductor
        const videoContainer = document.querySelector('.video-container');
        videoContainer.innerHTML = `
            <video id="video-player" class="video-player" controls autoplay playsinline>
                <source src="${videoUrl}" type="video/mp4">
                Tu navegador no soporta este video.
            </video>
            <div class="video-controls">
                <button id="subtitle-toggle" class="control-btn" style="display: none;" title="Subtítulos">CC</button>
                <select id="subtitle-selector" class="control-select" style="display: none;">
                    <option value="">🚫 Desactivar</option>
                </select>
            </div>
        `;
        
        const video = document.getElementById('video-player');
        
        // ===== GESTIÓN DE SUBTÍTULOS =====
        if (tracks.length > 0) {
            tracks.forEach((track, index) => {
                const trackElement = document.createElement('track');
                trackElement.kind = 'subtitles';
                trackElement.label = track.label || `Sub ${index + 1}`;
                trackElement.srclang = track.language || 'es';
                trackElement.src = track.file;
                trackElement.default = index === 0;
                video.appendChild(trackElement);
                
                // Opción en el selector
                const option = document.createElement('option');
                option.value = track.file;
                option.textContent = track.label || `Sub ${index + 1}`;
                document.getElementById('subtitle-selector').appendChild(option);
            });
            
            // Mostrar controles
            document.getElementById('subtitle-toggle').style.display = 'inline-block';
            document.getElementById('subtitle-selector').style.display = 'inline-block';
            
            // Evento para el selector
            document.getElementById('subtitle-selector').addEventListener('change', (e) => {
                Array.from(video.textTracks).forEach(track => track.mode = 'disabled');
                if (e.target.value) {
                    const selectedTrack = Array.from(video.textTracks).find(
                        t => t.label === e.target.selectedOptions[0].text
                    );
                    if (selectedTrack) selectedTrack.mode = 'showing';
                }
            });
            
            // Toggle CC
            document.getElementById('subtitle-toggle').addEventListener('click', () => {
                const selector = document.getElementById('subtitle-selector');
                selector.style.display = selector.style.display === 'none' ? 'inline-block' : 'none';
            });
        }
        
        // Eventos del video
        video.addEventListener('loadeddata', () => hideLoading());
        video.addEventListener('canplay', () => hideLoading());
        video.addEventListener('error', (e) => {
            console.error('Error video:', e);
            showError('Error al reproducir. Intenta otro servidor.');
        });
        
    } catch (error) {
        console.error('Error video:', error);
        hideLoading();
        showError('Error: ' + error.message);
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
    
    setupEpisodeNavigation();
}

function setupEpisodeNavigation() {
    const currentIndex = episodeList.findIndex(ep => ep.id === currentEpisodeId);
    const prevBtn = document.getElementById('prev-episode');
    const nextBtn = document.getElementById('next-episode');
    
    if (prevBtn) {
        prevBtn.disabled = currentIndex <= 0;
        prevBtn.onclick = () => {
            if (currentIndex > 0) loadEpisode(episodeList[currentIndex - 1]);
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentIndex >= episodeList.length - 1;
        nextBtn.onclick = () => {
            if (currentIndex < episodeList.length - 1) loadEpisode(episodeList[currentIndex + 1]);
        };
    }
}

function renderServers(servers) {
    const container = document.getElementById('server-selector');
    if (!container) return;
    
    container.innerHTML = '<h3>🎯 Servidores</h3>';
    
    const sub = servers.filter(s => s.type === 'sub');
    const dub = servers.filter(s => s.type === 'dub');
    
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
}

// Funciones de UI
function showLoading(message = 'Cargando...') {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
        loading.innerHTML = `<div class="spinner"></div><div>${message}</div>`;
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (!errorDiv) return;
    
    errorDiv.innerHTML = `
        <strong>⚠️ Error:</strong> ${message}
        <button onclick="this.parentElement.style.display='none'" style="margin-left: 1rem;">×</button>
    `;
    errorDiv.style.display = 'block';
    
    // Mostrar en reproductor también
    document.getElementById('video-player').innerHTML = `
        <div style="text-align:center;padding:3rem;color:#ff6b9d;">
            <h3>⚠️ Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#ff6b9d;border:none;border-radius:5px;color:white;cursor:pointer;">Reintentar</button>
        </div>
    `;
}

// Manejo de errores global
window.addEventListener('error', (e) => console.error('Error global:', e));
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rechazada:', e);
    showError('Error inesperado: ' + (e.reason?.message || 'Error desconocido'));
});
