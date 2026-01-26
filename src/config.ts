// src/config.ts

// 1. AUTOMATIC SWITCH
// If the site is Live (PROD), use the Real Server.
// If the site is Local (DEV), use Localhost.
export const BACKEND_URL = import.meta.env.PROD
    ? "https://YOUR-REAL-BACKEND-URL-HERE.com"  // <--- PASTE YOUR RAILWAY/RENDER LINK HERE!
    : "http://127.0.0.1:5005";

// Helper to determine frontend host (for QR codes)
export const FRONTEND_HOST = import.meta.env.PROD
    ? window.location.origin
    : `http://${import.meta.env.VITE_LOCAL_IP || 'localhost'}:5173`;