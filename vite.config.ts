import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'fs'
import { join } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * Vite dev-server middleware: GET /api/stems/:folder
 * Returns JSON array of .wav filenames in public/audio/stems/:folder/
 * Enables dynamic WAV discovery without a separate backend.
 *
 * Production alternative: pre-generate manifest.json via
 *   node scripts/generate-manifests.mjs
 */
function stemDiscoveryPlugin() {
  return {
    name: 'stem-discovery',
    configureServer(server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/api/stems', (req, res, next) => {
        const folder = req.url?.slice(1).split('?')[0] ?? ''
        if (!folder) { next(); return }

        try {
          const dir = join(process.cwd(), 'public', 'audio', 'stems', folder)
          const files = readdirSync(dir)
            .filter((f) => f.toLowerCase().endsWith('.wav'))
            .sort()

          // ── Debug log in terminal ──────────────────────────────────────────
          console.log(`[stems] ${folder}: ${files.length} WAV(s) → ${files.join(', ') || '(none)'}`)

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(files))
        } catch (err) {
          console.warn(`[stems] folder not found: public/audio/stems/${folder}`)
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify([]))
        }
      })
    },
  }
}

export default defineConfig({
  // ⚠️  Change 'dust-beatmaker' to your exact GitHub repo name
  base: process.env.NODE_ENV === 'production' ? '/dust-beatmaker/' : '/',  // rekoproducer/dust-beatmaker
  plugins: [react(), stemDiscoveryPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
