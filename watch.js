// watch.js - VERSIÓN DEFINITIVA CON MANEJO DE ERRORES
let currentAnimeId = null;
let currentEpisodeId = null;
let episodeList = [];
let currentVideoUrl = null;
let currentSubtitles = [];

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
        showError('❌ ID de anime no especificado en la URL');
        return;
    }
    
    currentAnimeId = animeId;
    
    // Botón volver
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
    
    try {
        showLoading('📡 Cargando episodios...');
        
        const response = await fetch(`${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.EPISODES}/${animeId}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'La API no devolvió éxito');
        }
        
        if (!data.results || !Array.isArray(data.results.episodes)) {
            throw new Error('Formato de respuesta inválido: no hay episodios');
        }
        
        episodeList = data.results.episodes.map(window.normalizeData.episode);
        
        if (episodeList.length === 0) {
            throw new Error('Este anime no tiene episodios disponibles');
        }
        
        console.log('✅ Episodios cargados:', episodeList.length);
        
        // Cargar primer episodio
        await loadEpisode(episodeList[0]);
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error al cargar episodios:', error);
        hideLoading();
        showError('No se pudieron cargar los episodios: ' + error.message);
    }
});

async function loadEpisode(episode) {
    // Extraer ID limpio
    let cleanEpisodeId = episode.id;
    if (episode.id.includes('?ep=')) {
        cleanEpisodeId = episode.id.split('?ep=')[1];
    }
    
    currentEpisodeId = cleanEpisodeId;
    
    console.log('🎬 Cargando episodio:', episode);
    console.log('🔑 ID limpio:', currentEpisodeId);
    
    // Actualizar UI
    document.getElementById('episode-title').textContent = 
        `Episodio ${episode.episode_no}${episode.title ? `: ${episode.title}` : ''}`;
    
    // Resetear reproductor
    resetVideoPlayer();
    
    // Cargar servidores
    try {
        const serversUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.SERVERS}/${currentAnimeId}?ep=${currentEpisodeId}`;
        console.log('📡 URL Servidores:', serversUrl);
        
        const serversResponse = await fetch(serversUrl);
        const serversData = await serversResponse.json();
        
        if (!serversData.success) {
            throw new Error('No se pudo obtener la lista de servidores');
        }
        
        if (!serversData.results || serversData.results.length === 0) {
            throw new Error('No hay servidores disponibles para este episodio');
        }
        
        console.log('✅ Servidores disponibles:', serversData.results);
        
        renderServers(serversData.results);
        
        // Intentar cargar el primer servidor automáticamente
        if (serversData.results.length > 0) {
            const firstServer = serversData.results[0];
            await loadVideo(firstServer.server_id, firstServer.type || 'sub');
        } else {
            throw new Error('No se encontraron servidores válidos');
        }
        
    } catch (error) {
        console.error('❌ Error al cargar servidores:', error);
        showError('Error con los servidores: ' + error.message);
    }
}

function resetVideoPlayer() {
    const videoContainer = document.querySelector('.video-container');
    videoContainer.innerHTML = `
        <video id="video-player" class="video-player" controls autoplay playsinline>
            <track id="subtitle-track" kind="subtitles" label="Subtítulos" srclang="es" default>
            Cargando video...
        </video>
        <div class="video-controls" style="position: absolute; bottom: 60px; right: 20px; z-index: 100;">
            <button id="subtitle-toggle" class="control-btn" style="display: none;">CC</button>
            <select id="subtitle-selector" class="control-select" style="display: none;">
                <option value="">🚫 Desactivar subtítulos</option>
            </select>
        </div>
    `;
}

async function loadVideo(serverId, type) {
    try {
        showLoading('📡 Cargando video del servidor...');
        
        const streamUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.STREAM}?id=${currentAnimeId}&server=${serverId}&type=${type}&ep=${currentEpisodeId}`;
        console.log('📡 URL Stream:', streamUrl);
        
        const response = await fetch(streamUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'El servidor no devolvió éxito');
        }
        
        if (!data.results) {
            throw new Error('Respuesta vacía del servidor');
        }
        
        // DEPURACIÓN: Ver estructura real
        console.log('📦 Respuesta completa de la API:', data);
        console.log('📦 streamingLink:', data.results.streamingLink);
        console.log('📦 servers:', data.results.servers);
        
        // Verificar si hay streamingLink
        if (!data.results.streamingLink || !Array.isArray(data.results.streamingLink) || data.results.streamingLink.length === 0) {
            throw new Error('No hay datos de streaming disponibles');
        }
        
        const streamData = data.results.streamingLink[0];
        console.log('📦 Primer streamingLink:', streamData);
        
        // Verificar si hay link y file
        if (!streamData.link || !streamData.link.file) {
            throw new Error('Enlace de video no disponible en este servidor');
        }
        
        const videoUrl = streamData.link.file;
        const tracks = streamData.tracks || [];
        
        console.log('✅ Video URL encontrada:', videoUrl);
        console.log('📝 Subtítulos encontrados:', tracks.length);
        
        if (tracks.length > 0) {
            tracks.forEach(track => console.log('  -', track.label || track.file));
        }
        
        // Crear reproductor
        setupVideoPlayer(videoUrl, tracks, type);
        
        // Actualizar UI de servidores
        updateServerSelection(serverId);
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error al cargar video:', error);
        hideLoading();
        showError('No se pudo cargar el video: ' + error.message);
        
        // Mostrar mensaje en el reproductor
        const videoContainer = document.querySelector('.video-container');
        videoContainer.innerHTML = `
            <div style="text-align:center;padding:3rem;color:#ff6b9d;background:#1a1a2e;border-radius:12px;">
                <h3>⚠️ Error al cargar el video</h3>
                <p>${error.message}</p>
                <p style="font-size:0.9rem;margin-top:1rem;">Intenta seleccionar otro servidor</p>
                <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#ff6b9d;border:none;border-radius:5px;color:white;cursor:pointer;">Reintentar</button>
            </div>
        `;
    }
}

function setupVideoPlayer(videoUrl, tracks, type) {
    const video = document.getElementById('video-player');
    
    // Configurar source
    video.innerHTML = `
        <source src="${videoUrl}" type="video/mp4">
        Tu navegador no soporta este video.
    `;
    
    // Añadir subtítulos
    if (tracks && tracks.length > 0) {
        tracks.forEach((track, index) => {
            const trackElement = document.createElement('track');
            trackElement.kind = 'subtitles';
            trackElement.label = track.label || `Sub ${index + 1}`;
            trackElement.srclang = track.language || 'es';
            trackElement.src = track.file;
            if (index === 0) trackElement.default = true;
            video.appendChild(trackElement);
            
            // Añadir al selector
            const option = document.createElement('option');
            option.value = track.file;
            option.textContent = track.label || `Sub ${index + 1}`;
            document.getElementById('subtitle-selector').appendChild(option);
        });
        
        // Mostrar controles
        document.getElementById('subtitle-toggle').style.display = 'inline-block';
        document.getElementById('subtitle-selector').style.display = 'none'; // Oculto por defecto
        
        // Evento toggle
        document.getElementById('subtitle-toggle').addEventListener('click', () => {
            const selector = document.getElementById('subtitle-selector');
            selector.style.display = selector.style.display === 'none' ? 'inline-block' : 'none';
        });
        
        // Evento selector
        document.getElementById('subtitle-selector').addEventListener('change', (e) => {
            Array.from(video.textTracks).forEach(track => track.mode = 'hidden');
            if (e.target.value) {
                const selectedTrack = Array.from(video.textTracks).find(
                    t => t.src === e.target.value
                );
                if (selectedTrack) selectedTrack.mode = 'showing';
            }
        });
    }
    
    // Eventos del video
    video.addEventListener('loadeddata', () => {
        console.log('✅ Video cargado correctamente');
        hideLoading();
    });
    
    video.addEventListener('canplay', () => {
        hideLoading();
    });
    
    video.addEventListener('error', (e) => {
        console.error('❌ Error en el video:', e);
        showError('Error al reproducir el video. Intenta con otro servidor.');
    });
}

function updateServerSelection(serverId) {
    // Resaltar servidor seleccionado
    document.querySelectorAll('.server-button').forEach(btn => {
        btn.style.background = btn.onclick.toString().includes(serverId) ? 'var(--primary-color)' : '';
    });
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
    
    container.innerHTML = '<h3>🎯 Servidores Disponibles</h3>';
    
    const sub = servers.filter(s => s.type === 'sub');
    const dub = servers.filter(s => s.type === 'dub');
    
    if (sub.length > 0) {
        container.innerHTML += '<h4>🔤 Subtitulado</h4>';
        sub.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'server-button';
            btn.textContent = s.serverName || `Servidor ${s.server_id}`;
            btn.onclick = () => loadVideo(s.server_id, 'sub');
            container.appendChild(btn);
        });
    }
    
    if (dub.length > 0) {
        container.innerHTML += '<h4>🎙️ Doblado</h4>';
        dub.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'server-button';
            btn.textContent = s.serverName || `Servidor ${s.server_id}`;
            btn.onclick = () => loadVideo(s.server_id, 'dub');
            container.appendChild(btn);
        });
    }
}

// Funciones de UI
function showLoading(message = 'Cargando...') {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
        loading.querySelector('div:last-child').textContent = message;
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
        <button onclick="this.parentElement.style.display='none'" style="margin-left: 1rem; background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">×</button>
    `;
    errorDiv.style.display = 'block';
    console.error('❌ Error mostrado al usuario:', message);
}

// Manejo de errores global
window.addEventListener('error', (e) => {
    console.error('❌ Error global no manejado:', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise rechazada no manejada:', e.reason);
    showError('Error inesperado: ' + (e.reason?.message || 'Error desconocido'));
});
