import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project from https://<user>.github.io/habit-tracker/,
  // not from the domain root. Without this, the built index.html would request
  // /assets/index.js instead of /habit-tracker/assets/index.js and the page
  // would load as a blank white screen. The trailing slash is required.
  base: '/habit-tracker/',
})
