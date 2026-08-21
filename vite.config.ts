import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production is served from https://originalkiser.github.io/tripplanner/
  // (a project page, not a <user>.github.io root repo), so every asset URL
  // needs this prefix there or they'll all 404. Local dev stays at '/' so
  // `npm run dev` doesn't require the prefix on every route.
  base: command === 'build' ? '/tripplanner/' : '/',
}))
