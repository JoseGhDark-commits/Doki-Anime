// api-adapter.js - NORMALIZADOR UNIVERSAL
window.normalizeData = {
    anime: function(raw) {
        return {
            id: raw.id || raw.data_id || '',
            title: raw.title || raw.name || 'Sin título',
            image: raw.poster || 'https://via.placeholder.com/200x280/ff6b9d/ffffff?text=No+Image',
            rating: raw.tvInfo?.['MAL Score'] || raw.tvInfo?.rating || 8.0,
            status: raw.tvInfo?.showType || 'Serie',
            type: raw.tvInfo?.showType || 'TV',
            episodes: raw.tvInfo?.eps || raw.tvInfo?.sub || 0
        };
    },
    
    episode: function(raw) {
        return {
            id: raw.id || raw.data_id || '',  // ESTO SOLUCIONA TODO
            episode_no: raw.episode_no || raw.number || 1,
            title: raw.title || raw.name || '',
            jname: raw.jname || ''
        };
    }
};
