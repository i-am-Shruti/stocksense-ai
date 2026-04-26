import axios from 'axios';

// Use Vercel rewrites: keep API paths relative so Vercel can proxy /api and /ml to the correct services.
const API_URL = '/api';
const ML_API_URL = '/ml';

const createAxiosInstance = (baseURL) => {
    const instance = axios.create({
        baseURL,
        headers: { "Content-Type": 'application/json' },
        timeout: 15000,
        withCredentials: true,
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );
    
    return instance;
};

const api = createAxiosInstance(API_URL);
const mlApi = createAxiosInstance(ML_API_URL);

const requestCache = new Map();
const CACHE_DURATION = 30000;

const getCachedData = (key) => {
    const cached = requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    requestCache.delete(key);
    return null;
};

const setCachedData = (key, data) => {
    requestCache.set(key, { data, timestamp: Date.now() });
};

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    sendOtp: (email) => api.post('/auth/send-otp', { email }),
    verifyOtp: (data) => api.post('/auth/verify-otp', data),
    updateProfile: (data) => api.put('/auth/profile', data),
    deleteAccount: () => api.delete('/auth/profile'),
};

export const stockAPI = {
    getAll: () => api.get('/stocks'),
    getBySymbol: (symbol) => api.get(`/stocks/${symbol}`),
    getPrediction: (symbol) => api.get(`/stocks/predict/${symbol}`),
    save: (data) => api.post('/stocks', data),
    delete: (id) => api.delete(`/stocks/${id}`),
};

export const mlAPI = {
    getRealtime: (symbol) => {
        const cacheKey = `realtime_${symbol}`;
        const cached = getCachedData(cacheKey);
        if (cached) return Promise.resolve({ data: cached });
        return mlApi.get(`/stock/realtime/${symbol}`).then(res => {
            setCachedData(cacheKey, res.data);
            return res;
        });
    },
    getHistory: (symbol, period = '3mo') => {
        const cacheKey = `history_${symbol}_${period}`;
        const cached = getCachedData(cacheKey);
        if (cached) return Promise.resolve({ data: cached });
        return mlApi.get(`/stock/history/${symbol}?period=${period}`).then(res => {
            setCachedData(cacheKey, res.data);
            return res;
        });
    },
    getIndicators: (symbol) => {
        const cacheKey = `indicators_${symbol}`;
        const cached = getCachedData(cacheKey);
        if (cached) return Promise.resolve({ data: cached });
        return mlApi.get(`/stock/indicators/${symbol}`).then(res => {
            setCachedData(cacheKey, res.data);
            return res;
        });
    },
    getNews: (symbol) => mlApi.get(`/market/news/${symbol}`),
    search: (query) => mlApi.get(`/stock/search?q=${query}`),
    getPrediction: (symbol, autoTrain = true) => mlApi.post('/predict', { symbol, auto_train: autoTrain }),
    train: (symbol) => mlApi.post('/train', { symbol }),
    getTrainStatus: (symbol) => mlApi.get(`/train/status/${symbol}`),
    compare: (symbols) => mlApi.post('/stock/compare', { symbols }),
    health: () => mlApi.get('/health'),
};

export const parallelFetch = async (requests) => {
    return Promise.all(requests.map(req => req.catch(err => ({ error: err.message }))));
};

export default api;