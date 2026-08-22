import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// A fresh id per build, embedded in the JS bundle (via `define` below) and
// also written to a plain, unhashed `version.json` in the build output. The
// running app polls that file (bypassing HTTP cache) and compares it to its
// own embedded id — a mismatch means a newer build has been deployed, which
// is how the in-app "update available" banner knows to show up without
// requiring a hard refresh.
const buildId = Date.now().toString(36)

function versionFilePlugin(): Plugin {
  return {
    name: 'write-version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), versionFilePlugin()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  // Production is served from https://originalkiser.github.io/tripplanner/
  // (a project page, not a <user>.github.io root repo), so every asset URL
  // needs this prefix there or they'll all 404. Local dev stays at '/' so
  // `npm run dev` doesn't require the prefix on every route.
  base: command === 'build' ? '/tripplanner/' : '/',
}))
