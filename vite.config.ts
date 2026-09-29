import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // En GitHub Pages la app vive en /la-esquina/.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,png}'], importScripts: ['sw-avisos.js'] },
      manifest: {
        name: 'La Esquina',
        short_name: 'La Esquina',
        description: 'Comandas, cobro y cocina de La Esquina, perros calientes.',
        lang: 'es',
        theme_color: '#181816',
        background_color: '#242625',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
