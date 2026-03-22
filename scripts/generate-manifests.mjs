/**
 * Generates manifest.json in each stem bank folder for production builds.
 * Dev server uses /api/stems/:folder (Vite middleware) for live discovery.
 * Production uses /audio/stems/:folder/manifest.json (static file).
 *
 * Run before `npm run build`:
 *   node scripts/generate-manifests.mjs
 *
 * Or add to package.json:
 *   "build": "node scripts/generate-manifests.mjs && tsc -b && vite build"
 */
import { readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STEMS_DIR = join(ROOT, 'public', 'audio', 'stems')

let totalBanks = 0
let totalFiles = 0

try {
  const banks = readdirSync(STEMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const bank of banks) {
    const bankDir = join(STEMS_DIR, bank)
    const wavFiles = readdirSync(bankDir)
      .filter((f) => f.toLowerCase().endsWith('.wav'))
      .sort()

    const manifestPath = join(bankDir, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(wavFiles, null, 2))
    console.log(`✓  ${bank}/manifest.json  (${wavFiles.length} files: ${wavFiles.join(', ')})`)
    totalBanks++
    totalFiles += wavFiles.length
  }

  console.log(`\nGenerated ${totalBanks} manifests, ${totalFiles} total WAV files indexed.`)
} catch (err) {
  console.error('Error generating manifests:', err.message)
  process.exit(1)
}
