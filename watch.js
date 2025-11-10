// watch.js - VERSIÓN 100% ESTÁTICA
let currentAnimeId = null;
let currentEpisodeId = null;
let episodeList = [];

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
        alert('ID de anime no especificado');
        return;
    }
    
    currentAnimeId = animeId;
    
    // Cargar episodios
    try {
        const response = await fetch(`${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.EPISODES}/${animeId}`);
        const data = await response.json();
        
        if (!data.success || !Array.isArray(data.results?.episodes)) {
            throw new Error('Sin episodios');
        }
        
        // Normalizar usando el adaptador
        episodeList = data.results.episodes.map(window.normalizeData.episode);
        
        console.log('✅ Episodios cargados:', episodeList);
        
        if (episodeList.length === 0) {
            alert('No hay episodios disponibles');
            return;
        }
        
        // Cargar primer episodio
        await loadEpisode(episodeList[0]);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el anime');
    }
});

async function loadEpisode(episode) {
    currentEpisodeId = episode.id; // USAR ID NORMALIZADO
    
    console.log('🎬 Cargando episodio:', episode);
    console.log('🔑 ID del episodio:', currentEpisodeId);
    
    // Actualizar título
    document.getElementById('episode-title').textContent = 
        `Episodio ${episode.episode_no}${episode.title ? `: ${episode.title}` : ''}`;
    
    // Renderizar lista
    renderEpisodeList();
    
    // Cargar servidores
    try {
        const serversUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.SERVERS}/${currentAnimeId}?ep=${currentEpisodeId}`;
        console.log('📡 URL Servidores:', serversUrl);
        
        const serversResponse = await fetch(serversUrl);
        const serversData = await serversResponse.json();
        
        if (!serversData.success) throw new Error('Sin servidores');
        
        console.log('✅ Servidores recibidos:', serversData.results);
        
        renderServers(serversData.results);
        
        // Auto-cargar primer servidor
        if (serversData.results.length > 0) {
            const first = serversData.results[0];
            await loadVideo(first.server_id, first.type || 'sub');
        }
        
    } catch (error) {
        console.error('Error servidores:', error);
        alert('No se pudieron cargar servidores');
    }
}

async function loadVideo(serverId, type) {
    try {
        const streamUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.STREAM}?id=${currentAnimeId}&server=${serverId}&type=${type}&ep=${currentEpisodeId}`;
        
        console.log('📡 URL Stream:', streamUrl);
        
        const response = await fetch(streamUrl);
        const data = await response.json();
        
        if (!data.success || !data.results?.streamingLink?.[0]?.link?.file) {
            throw new Error('Enlace no disponible');
        }
        
        const videoUrl = data.results.streamingLink[0].link.file;
        
        console.log('✅ Video URL:', videoUrl);
        
        document.getElementById('video-player').innerHTML = `
            <video class="video-player" controls autoplay playsinline>
                <source src="${videoUrl}" type="video/mp4">
                Tu navegador no soporta video.
            </video>
        `;
        
    } catch (error) {
        console.error('Error video:', error);
        alert('Error al cargar el video');
    }
}

function renderEpisodeList() {
    const container = document.querySelector('.episode-grid');
    container.innerHTML = '';
    
    episodeList.forEach(ep => {
        const button = document.createElement('div');
        button.className = 'episode-item';
        if (ep.id === currentEpisodeId) button.classList.add('active');
        button.textContent = ep.episode_no || '?';
        button.onclick = () => loadEpisode(ep);
        container.appendChild(button);
    });
}

function renderServers(servers) {
    const container = document.getElementById('server-selector');
    container.innerHTML = '<h3>Servidores</h3>';
    
    const sub = servers.filter(s => s.type === 'sub');
    const dub = servers.filter(s => s.type === 'dub');
    
    if (sub.length > 0) {
        container.innerHTML += '<h4>Subtitulado</h4>' + 
            sub.map(s => `<button onclick="loadVideo('${s.server_id}','sub')" class="server-button">${s.serverName || s.server_id}</button>`).join('');
    }
    
    if (dub.length > 0) {
        container.innerHTML += '<h4>Doblado</h4>' + 
            dub.map(s => `<button onclick="loadVideo('${s.server_id}','dub')" class="server-button">${s.serverName || s.server_id}</button>`).join('');
    }
}
