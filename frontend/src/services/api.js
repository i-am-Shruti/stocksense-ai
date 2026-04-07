import axios from 'axios';

const API_URL = 'https://stocksense-ai-backend-sdgv.onrender.com/api';
const ML_API_URL = 'https://stocksense-ai-bdd9.onrender.com';

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": 'application/json' }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
};

export const stockAPI = {
    getAll: () => api.get('/stocks'),
    getBySymbol: (symbol) => api.get(`/stocks/${symbol}`),
    getPrediction: (symbol) => api.get(`/stocks/predict/${symbol}`),
    save: (data) => api.post('/stocks', data),
    delete: (id) => api.delete(`/stocks/${id}`),
};

const mlApi = axios.create({
    baseURL: ML_API_URL,
    headers: { "Content-Type": 'application/json' }
});

export const mlAPI = {
    getRealtime: (symbol) => mlApi.get(`/stock/realtime/${symbol}`),
    getHistory: (symbol, period = '3mo') => mlApi.get(`/stock/history/${symbol}?period=${period}`),
    getIndicators: (symbol) => mlApi.get(`/stock/indicators/${symbol}`),
    getNews: (symbol) => mlApi.get(`/market/news/${symbol}`),
    search: (query) => mlApi.get(`/stock/search?q=${query}`),
    getPrediction: (symbol, autoTrain = true) => mlApi.post('/predict', { symbol, auto_train: autoTrain }),
    train: (symbol) => mlApi.post('/train', { symbol }),
    getTrainStatus: (symbol) => mlApi.get(`/train/status/${symbol}`),
    compare: (symbols) => mlApi.post('/stock/compare', { symbols }),
    health: () => mlApi.get('/health'),
};

export default api;