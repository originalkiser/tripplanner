import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from https://originalkiser.github.io/tripplanner/ (a project
  // page, not a <user>.github.io root repo), so every asset URL needs this
  // prefix or they'll all 404.
  base: '/tripplanner/',
})
