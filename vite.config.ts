import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';

export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      // ✅ THE FIX: This spread syntax tells TS "If serve mode, add this array. If not, add nothing."
      ...(command === 'serve' ? [basicSsl()] : []),
    ],
    server: {
      host: true,
      proxy: {
        '/socket.io': {
          target: 'http://localhost:5005',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/files': {
          target: 'http://localhost:5005',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react-map-gl': path.resolve(__dirname, './node_modules/react-map-gl/dist/mapbox.js'),
        'splaytree': path.resolve(__dirname, 'node_modules/splaytree/dist/splaytree.js'),
      },
    },
    optimizeDeps: {
      include: [
        'react-map-gl',
        'mapbox-gl',
        'three',
        'three-stdlib',
        'splaytree',
        'polygon-clipping'
      ],
    }
  };
});