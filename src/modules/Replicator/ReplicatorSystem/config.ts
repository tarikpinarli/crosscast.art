export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://dualsculp-backend-go.onrender.com";

export const FRONTEND_HOST = import.meta.env.PROD
    ? window.location.origin
    : `http://${import.meta.env.VITE_LOCAL_IP || 'localhost'}:5173`;