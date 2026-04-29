// ==========================================
// Axios API Instance
// ==========================================

import axios from 'axios';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseURL = typeof envBaseUrl === 'string' && envBaseUrl.trim()
  ? envBaseUrl.trim().replace(/\/+$/, '')
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = err.config?.url || '';
    const isAuthRequest = /\/auth\/(login|refresh)$/.test(requestUrl);

    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const loginPath = window.location.pathname.startsWith('/frontend')
        ? '/frontend/login'
        : '/login';

      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
