import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_DOCKER_ENV ? 'http://backend:8000' : 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_DOCKER_ENV ? 'http://backend:8000' : 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})