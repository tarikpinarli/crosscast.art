import axios from 'axios';

// Point to your Dockerized Backend
const API_URL = 'http://localhost:5005';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Auto-attach the Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crosscast_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Auto-Logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or invalid token');
      localStorage.removeItem('crosscast_token');
      // We will handle the redirect in the UI layer later
    }
    return Promise.reject(error);
  }
);