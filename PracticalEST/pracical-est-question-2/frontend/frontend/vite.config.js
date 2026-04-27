import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',   // ← fixes "global is not defined" for sockjs-client
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'http://localhost:9000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})