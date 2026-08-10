/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // The .env lives at the repository root and is shared with the backend — one file for
  // VITE_SERVER_URL, PORT and the rest. Without this Vite would only look inside frontend/,
  // find nothing, and silently fall back to same-origin URLs in development.
  envDir: '..',
  test: {
    // Components need a DOM to mount into. The pure utility tests do not care either way.
    environment: 'jsdom',
    server: {
      deps: {
        // Vuetify ships untranspiled CSS imports inside its ESM. Left external, Node's own loader
        // resolves them and throws ERR_UNKNOWN_FILE_EXTENSION for ".css" before a single component
        // mounts. Inlined, they go through Vite, which knows what to do with a stylesheet.
        inline: ['vuetify'],
      },
    },
  },
})
