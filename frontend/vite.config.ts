import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // The .env lives at the repository root and is shared with the backend — one file for
  // VITE_SERVER_URL, PORT and the rest. Without this Vite would only look inside frontend/,
  // find nothing, and silently fall back to same-origin URLs in development.
  envDir: '..',
})
