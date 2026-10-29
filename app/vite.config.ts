import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend (app/server) listens on localhost only; the browser reaches it through this proxy,
// so the Ollama API key never leaves the machine and LAN clients only need the Vite port.
const api = { '/api': { target: `http://127.0.0.1:${process.env.PORT ?? 8787}` } }

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
})
