import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:2077',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PAGE.verse',
        short_name: 'PAGE.verse',
        description: 'Your personal digital library and immersive PDF reader.',
        lang: 'en',
        start_url: '.',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#f2f6f3',
        background_color: '#f2f6f3',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,mjs,ico,png,svg,woff2}'],
        // El worker de pdf.js pesa ~1 MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
