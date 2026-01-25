import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';

export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      ...(command === 'serve' ? [basicSsl()] : []),
    ],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/socket.io': {
          target: 'http://127.0.0.1:5005',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/files': {
          target: 'http://127.0.0.1:5005',
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