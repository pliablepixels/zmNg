import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // No proxy needed - using standalone Express proxy server on port 3001
  // Run with: npm run dev:all (starts both proxy and vite)
})
