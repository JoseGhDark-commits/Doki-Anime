import { API_CONFIG } from './api-config.js';

let currentAnimeId = null;
let currentEpisodeDataId = null;
let episodeList = [];
let animeInfo = null;

// Mostrar/ocultar loading
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

// Mostrar mensaje de error
function showError(message) {
    const el = document.getElementById('error-message');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
    console.error('Error:', message);
}

// Navegar atrás
document.getElementById('back-btn').onclick = () => window.history.back();

// Cargar info del anime
async function loadAnimeInfo(animeId) {
    try {
        showLoading(true);
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INFO}?id=${encodeURIComponent(animeId)}`);
        const data = await res.json();
        
        if (!data?.success || !data.results?.data) {
            throw new Error('Anime no encontrado');
        }
        return data.results.data;
    } catch (err) {
        console.error('Error al cargar info del anime:', err);
        showError('No se pudo cargar la información del anime.');
        return null;
    } finally {
        showLoading(false);
    }
}

// Cargar episodios
async function loadEpisodes(animeId) {
    try {
        showLoading(true);
        // IMPORTANTE: El endpoint es /api/episodes/{id} sin parámetros extra
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODES}/${encodeURIComponent(animeId)}`);
        const data = await res.json();
        
        if (!data?.success || !Array.isArray(data.results?.episodes)) {
            console.warn('No hay episodios disponibles o formato incorrecto');
            return [];
        }
        return data.results.episodes;
    } catch (err) {
        console.error('Error al cargar episodios:', err);
        showError('No se pudieron cargar los episodios.');
        return [];
    } finally {
        showLoading(false);
    }
}

// Cargar servidores
async function loadServers(animeId, epDataId) {
    try {
        // IMPORTANTE: La URL debe ser /api/servers/{animeId}?ep={epDataId}
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVERS}/${encodeURIComponent(animeId)}?ep=${epDataId}`;
        console.log('Cargando servidores:', url);
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data?.success || !Array.isArray(data.results)) {
            throw new Error('Sin servidores disponibles');
        }
        return data.results;
    } catch (err) {
        console.error('Error al cargar servidores:', err);
        showError('No hay servidores disponibles para este episodio.');
        return [];
    }
}

// Obtener enlace de streaming
async function getStreamUrl(animeId, serverId, epDataId, type = 'sub') {
    try {
        // IMPORTANTE: Parámetros en query string
        const url = new URL(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STREAM}`);
        url.searchParams.append('id', animeId);
        url.searchParams.append('server', serverId);
        url.searchParams.append('type', type);
        url.searchParams.append('ep', epDataId);

        console.log('Obteniendo stream:', url.toString());
        const res = await fetch(url);
        const data = await res.json();

        if (!data?.success || !data.results?.streamingLink?.[0]?.link?.file) {
            console.error('Respuesta inválida:', data);
            throw new Error('Enlace de video no disponible');
        }
        
        return data.results.streamingLink[0].link.file;
    } catch (err) {
        console.error('Error al obtener enlace de streaming:', err);
        showError('No se pudo cargar el video. Intenta otro servidor.');
        return null;
    }
}

// Renderizar información del anime
function renderAnimeInfo(info) {
    document.getElementById('anime-title').textContent = info.title || 'Sin título';
    document.getElementById('anime-description').textContent = info.animeInfo?.Overview || 'Sin descripción';
    
    const image = document.getElementById('anime-image');
    if (info.poster) {
        image.src = info.poster;
        image.style.display = 'block';
    }
    
    const rating = info.animeInfo?.['MAL Score'] || 'N/A';
    document.getElementById('anime-rating').textContent = `⭐ ${rating}`;
}

// Renderizar lista de episodios
function renderEpisodeList(episodes, activeEpDataId = null) {
    const container = document.querySelector('.episode-grid');
    container.innerHTML = '';

    episodes.forEach(ep => {
        const button = document.createElement('div');
        button.className = 'episode-item';
        if (ep.data_id === activeEpDataId) button.classList.add('active');
        button.textContent = ep.episode_no || '?';
        button.onclick = () => loadEpisode(ep);
        container.appendChild(button);
    });
}

// Renderizar selectores de servidor
function renderServers(servers, animeId, epDataId) {
    const container = document.getElementById('server-selector');
    
    if (servers.length === 0) {
        container.innerHTML = '<h3>Servidores</h3><p>No hay servidores disponibles.</p>';
        return;
    }

    // Agrupar por tipo
    const subServers = servers.filter(s => s.type === 'sub');
    const dubServers = servers.filter(s => s.type === 'dub');

    let html = '<h3>Servidores</h3>';

    if (subServers.length > 0) {
        html += '<div class="server-section"><h4>Subtitulado</h4>';
        subServers.forEach(s => {
            html += `
                <button class="server-button" data-server="${s.server_id}" data-type="sub">
                    ${s.serverName || `Servidor ${s.server_id}`}
                </button>`;
        });
        html += '</div>';
    }

    if (dubServers.length > 0) {
        html += '<div class="server-section"><h4>Doblado</h4>';
        dubServers.forEach(s => {
            html += `
                <button class="server-button" data-server="${s.server_id}" data-type="dub">
                    ${s.serverName || `Servidor ${s.server_id}`}
                </button>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;

    // Eventos para cada botón
    container.querySelectorAll('.server-button').forEach(btn => {
        btn.onclick = async () => {
            const serverId = btn.dataset.server;
            const type = btn.dataset.type;
            
            showLoading(true);
            const url = await getStreamUrl(currentAnimeId, serverId, currentEpisodeDataId, type);
            showLoading(false);
            
            if (url) {
                document.getElementById('video-player').innerHTML = `
                    <video class="video-player" controls autoplay playsinline>
                        <source src="${url}" type="video/mp4">
                        Tu navegador no soporta el video.
                    </video>
                `;
            }
        };
    });
}

// Cargar un episodio completo
async function loadEpisode(episode) {
    currentEpisodeDataId = episode.data_id;
    document.getElementById('episode-title').textContent = 
        `Episodio ${episode.episode_no}${episode.title ? `: ${episode.title}` : ''}`;

    // Actualizar UI
    renderEpisodeList(episodeList, episode.data_id);

    // Cargar servidores
    showLoading(true);
    const servers = await loadServers(currentAnimeId, episode.data_id);
    renderServers(servers, currentAnimeId, episode.data_id);
    
    // Cargar primer servidor automáticamente
    if (servers.length > 0) {
        const first = servers[0];
        const url = await getStreamUrl(currentAnimeId, first.server_id, episode.data_id, first.type || 'sub');
        if (url) {
            document.getElementById('video-player').innerHTML = `
                <video class="video-player" controls autoplay playsinline>
                    <source src="${url}" type="video/mp4">
                    Tu navegador no soporta el video.
                </video>
            `;
        }
    }
    showLoading(false);

    // Actualizar URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('ep', episode.episode_no);
    window.history.replaceState(null, '', newUrl);
}

// Inicialización
async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
        showError('ID de anime no especificado.');
        return;
    }

    currentAnimeId = animeId;
    showLoading(true);

    // Cargar información del anime
    animeInfo = await loadAnimeInfo(animeId);
    if (!animeInfo) {
        showLoading(false);
        return;
    }

    // Cargar lista de episodios
    episodeList = await loadEpisodes(animeId);
    if (!episodeList || episodeList.length === 0) {
        showLoading(false);
        showError('Este anime no tiene episodios disponibles.');
        return;
    }

    // Renderizar información básica
    renderAnimeInfo(animeInfo);
    renderEpisodeList(episodeList);

    // Determinar episodio inicial
    const epNo = parseInt(urlParams.get('ep')) || 1;
    const targetEp = episodeList.find(ep => ep.episode_no === epNo) || episodeList[0];
    
    if (targetEp) {
        await loadEpisode(targetEp);
    }

    showLoading(false);

    // Configurar navegación
    const prevBtn = document.getElementById('prev-episode');
    const nextBtn = document.getElementById('next-episode');

    if (prevBtn) {
        prevBtn.onclick = () => {
            const idx = episodeList.findIndex(ep => ep.data_id === currentEpisodeDataId);
            if (idx > 0) loadEpisode(episodeList[idx - 1]);
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            const idx = episodeList.findIndex(ep => ep.data_id === currentEpisodeDataId);
            if (idx < episodeList.length - 1) loadEpisode(episodeList[idx + 1]);
        };
    }
}

// Iniciar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', init);
