// api-config.js - VERSIÓN 100% ESTÁTICA (sin export)
window.API_CONFIG = {
    BASE_URL: 'https://anime-iota-nine.vercel.app',
    ENDPOINTS: {
        HOME: '/api/',
        SEARCH: '/api/search',
        SEARCH_SUGGEST: '/api/search/suggest',
        INFO: '/api/info',
        EPISODES: '/api/episodes',
        SERVERS: '/api/servers',
        STREAM: '/api/stream',
        STREAM_FB: '/api/stream/fallback',
        FILTER: '/api/filter',
        SCHEDULE: '/api/schedule',
        CHARACTER_LIST: '/api/character/list',
        CHARACTER: '/api/character',
        ACTOR: '/api/actors',
        TOP_TEN: '/api/top-ten',
        TOP_SEARCH: '/api/top-search',
        
        // CATEGORÍAS (ESTO TE FALTA)
        CATEGORIES: {
            POPULAR: '/api/most-popular',
            AIRING: '/api/top-airing',
            MOVIES: '/api/movie',
            RECENT: '/api/recently-added',
            UPDATED: '/api/recently-updated',
            FAVORITE: '/api/most-favorite',
            COMPLETED: '/api/completed',
            SUBBED: '/api/subbed-anime',
            DUBBED: '/api/dubbed-anime',
            UPCOMING: '/api/top-upcoming'
        },
        
        // Géneros
        GENRE: (genre, page = 1) => `/api/genre/${genre}?page=${page}`,
        
        // Productores
        PRODUCER: (producer, page = 1) => `/api/producer/${producer}?page=${page}`
    }
};
