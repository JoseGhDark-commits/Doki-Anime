// api-config.js - Configuración centralizada de la API
const API_CONFIG = {
    BASE_URL: 'https://anime-iota-nine.vercel.app',
    ENDPOINTS: {
        HOME: '/api/',
        SEARCH: '/api/search',
        SEARCH_SUGGEST: '/api/search/suggest',
        INFO: '/api/info',
        EPISODES: '/api/episodes',
        SERVERS: '/api/servers',
        STREAM: '/api/stream',
        GENRE: '/api/genre',
        CATEGORIES: {
            POPULAR: '/api/most-popular',
            AIRING: '/api/top-airing',
            MOVIES: '/api/movie',
            RECENT: '/api/recently-added',
            FAVORITE: '/api/most-favorite',
            UPDATED: '/api/recently-updated'
        }
    }
};
