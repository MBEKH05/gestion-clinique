import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['NABY.jpg', 'favicon.svg'],
      manifest: {
        name: 'Clinique Sope Naby - Facturation',
        short_name: 'Clinique Naby',
        description: 'Plateforme de facturation de la Clinique Sope Naby',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f7fc',
        theme_color: '#1d5fd6',
        lang: 'fr',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // /storage/ sert les fichiers (PDF/images) des dossiers labo -- sans
        // cette exclusion, le service worker intercepte ces requetes comme
        // une navigation SPA et renvoie index.html au lieu du fichier reel
        // (symptome : apercu/impression/lien direct affichent l'app au lieu
        // du PDF).
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/storage\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  envPrefix: 'REACT_APP_',
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
})
