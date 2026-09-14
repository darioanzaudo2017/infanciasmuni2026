/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Sistema Protección Derechos NNyA',
        short_name: 'Protección NNyA',
        description: 'Sistema de gestión de casos de protección de derechos de NNyA - Municipalidad de Córdoba Capital',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#004884',
        background_color: '#f8fafc',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo precachea los assets estáticos del build. Sin runtimeCaching:
        // las llamadas a Supabase (otro origen) nunca pasan por el service worker,
        // así que no hay riesgo de servir datos de casos desactualizados offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // El bundle principal todavía no tiene code-splitting (~5.4MB sin comprimir);
        // se sube el límite para que el build no falle. Ver nota en CLAUDE.md sobre
        // dividir el bundle a futuro (mejora de performance aparte, no de esta tarea).
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
