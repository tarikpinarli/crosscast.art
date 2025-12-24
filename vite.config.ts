import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // CORRECT PATH based on your 'ls' output:
      'react-map-gl': path.resolve(__dirname, './node_modules/react-map-gl/dist/mapbox.js'),
    },
  },
  optimizeDeps: {
    include: ['react-map-gl', 'mapbox-gl'],
  }
});