import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sass from 'sass'

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{js,jsx,ts,tsx}" 
    })
    
  ],

  
  build: {
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true, // Enable CSS code-splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
         
          if (id.includes('node_modules')) {
            
            if (id.includes('moment')) {
              return 'vendor_moment';
            }
            
            if (id.includes('react') || id.includes('redux')) {
              return 'vendor_react';
            }
           
            return 'vendor';
          }
        }
      }
    }
  },
 
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        logger: {
          warn: (message) => {
            if (
              !message.includes('Deprecation Warning') &&
              !message.includes('@import rules are deprecated') &&
              !message.includes('Global built-in functions are deprecated and will be removed') &&
              !message.includes('The legacy JS API is deprecated and will be removed') &&
              !message.includes('https://sass-lang.com/d/color-functions') &&
              !message.includes('repetitive deprecation warnings omitted')
            ) {
              console.warn(message);
            }
          },
        },
      },
    },
  },

  resolve: {
    alias: {
      moment: 'moment/moment.js',
    },
    dedupe: ['react', 'react-dom'],
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})