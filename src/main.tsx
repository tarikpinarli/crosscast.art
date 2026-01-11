import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'; // <--- IMPORT THIS
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider> {/* <--- WRAP APP HERE */}
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)