import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/letschat-test-app/',
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(Date.now().toString())
  },
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
      },
      manifest: {
        name: 'LetsChat',
        short_name: 'LetsChat',
        description: 'Chat without the chaos.',
        start_url: '/letschat-test-app/',
        scope: '/letschat-test-app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        share_target: {
          action: './share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'media',
                accept: [
                  'image/*',
                  'video/*',
                  'audio/*',
                  'application/*'
                ]
              }
            ]
          }
        }
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
