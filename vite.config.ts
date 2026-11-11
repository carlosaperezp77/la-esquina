import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Marca del negocio (ver src/config/negocio.json).
const esDemo = process.env.VITE_DEMO === '1'
const negocio = JSON.parse(readFileSync(new URL(esDemo ? './src/config/negocio.demo.json' : './src/config/negocio.json', import.meta.url), 'utf8')) as {
  nombre: string
  descripcion: string
}

export default defineConfig({
  // En GitHub Pages la app vive en /la-esquina/.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    { name: 'titulo-negocio', transformIndexHtml: html => html.replace('%NOMBRE_NEGOCIO%', negocio.nombre) },
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        importScripts: ['sw-avisos.js'],
        // La demo vive en /demo/ dentro de la app publicada: que la app real no la tape.
        navigateFallbackDenylist: esDemo ? [] : [/\/demo\//],
      },
      manifest: {
        name: negocio.nombre,
        short_name: negocio.nombre,
        description: negocio.descripcion,
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
