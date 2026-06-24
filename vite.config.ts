import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ALLOWED_HOSTS, HOSTNAME, PORT } from './config/ports.ts'
import { apiPlugin } from './vite-plugin-api.ts'

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: HOSTNAME,
    port: PORT,
    strictPort: true,
    allowedHosts: ALLOWED_HOSTS,
    watch: {
      ignored: ['**/exe/**', '**/electron-dist/**'],
    },
  },
})
