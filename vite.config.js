import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/letschat-test-app/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server:{
    host:true,
    port:5173,
    allowedHosts: ['*'
    ]
  }
})
