import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async';
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'; // 👈 Import this

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider> {/* 👈 Add this Wrapper */}
        <App />
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>,
)