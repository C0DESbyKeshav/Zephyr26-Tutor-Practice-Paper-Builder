import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Suppress warning — this app intentionally bundles full Supabase + analytics libs
    chunkSizeWarningLimit: 600,
  },
})
