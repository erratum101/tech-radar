import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Деплой в подпапку (GitHub Pages и т.д.): задайте base: '/имя-репозитория/'
  plugins: [react()],
  server: {
    host: '127.0.0.1'
  },
  build: {
        chunkSizeWarningLimit: 1600
    }
})
