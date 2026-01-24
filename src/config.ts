// src/config.ts

// 1. Prioritize the Environment Variable (Vercel/Local .env)
// 2. Fallback to your NEW Go Backend URL (hardcoded safety net)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://dualsculp-backend-go.onrender.com";

// Helper to determine frontend host (for QR codes)
export const FRONTEND_HOST = import.meta.env.PROD
    ? window.location.origin
    : `http://${import.meta.env.VITE_LOCAL_IP || 'localhost'}:5173`;