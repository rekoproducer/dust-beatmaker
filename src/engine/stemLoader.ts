import * as Tone from 'tone'
import type { StemBank, TrackId } from '../sequencer/types'
import { STEM_BANKS } from '../sequencer/types'

/** One Sampler per discovered WAV file. Keyed by trackId (filename w/o .wav). */
export type DynamicSamplers = Record<string, Tone.Sampler>

/** Helper: get folder name for a bank */
export function bankFolder(bank: StemBank): string {
  return STEM_BANKS.find((b) => b.id === bank)?.folder ?? bank
}

/**
 * Discover WAV files in a bank folder.
 *
 * Dev:  GET /api/stems/:folder  (Vite middleware — reads filesystem live, no cache)
 * Prod: GET /audio/stems/:folder/manifest.json  (pre-generated static file)
 *
 * Returns sorted array of filenames, e.g. ["BD1.wav", "SD.wav"]
 * Note: folder name is URI-encoded so paths with spaces work correctly.
 */
export async function discoverBankFiles(folder: string): Promise<string[]> {
  const encodedFolder = encodeURIComponent(folder)

  // 1. Try dev API — always fresh on refresh
  try {
    const res = await fetch(`/api/stems/${encodedFolder}`, { cache: 'no-store' })
    if (res.ok) {
      const files: string[] = await res.json()
      console.log(`[stemLoader] discovered ${files.length} file(s) in ${folder}:`, files)
      if (files.length > 0) return files
    }
  } catch (err) {
    console.warn('[stemLoader] dev API unreachable, trying manifest fallback', err)
  }

  // 2. Fall back to pre-generated manifest.json (production / GitHub Pages)
  // import.meta.env.BASE_URL = '/dust-beatmaker/' in prod, '/' in dev
  const base = import.meta.env.BASE_URL ?? '/'
  try {
    const manifestUrl = `${base}audio/stems/${encodedFolder}/manifest.json`
    console.log(`[stemLoader] trying manifest: ${manifestUrl}`)
    const res = await fetch(manifestUrl, { cache: 'no-store' })
    if (res.ok) {
      const files: string[] = await res.json()
      console.log(`[stemLoader] manifest fallback: ${files.length} file(s)`, files)
      return files
    }
  } catch { /* no manifest */ }

  console.warn(`[stemLoader] no files found for "${folder}" — BASE_URL: ${import.meta.env.BASE_URL}`)
  return []
}

/**
 * Load one Tone.Sampler per discovered WAV file.
 * TrackId = filename without extension (e.g. "BD1", "SD").
 * Filenames with spaces are URI-encoded in the Sampler URL.
 */
export function loadDynamicSamplers(
  folder: string,
  files: string[],
  destination: Tone.ToneAudioNode
): Promise<DynamicSamplers> {
  return new Promise((resolve, reject) => {
    if (files.length === 0) { resolve({}); return }

    const samplers: DynamicSamplers = {}
    let loaded = 0
    let errored = false

    files.forEach((filename) => {
      const trackId = filename.replace(/\.wav$/i, '')
      // encodeURIComponent handles spaces and special chars in filenames
      const encodedFile = encodeURIComponent(filename)

      samplers[trackId] = new Tone.Sampler({
        urls: { C4: encodedFile },
        baseUrl: `${import.meta.env.BASE_URL ?? '/'}audio/stems/${folder}/`,
        onload: () => {
          loaded++
          console.log(`[stemLoader] loaded ${trackId} (${loaded}/${files.length})`)
          if (loaded === files.length) resolve(samplers)
        },
        onerror: (err) => {
          if (!errored) {
            errored = true
            console.error(`[stemLoader] failed to load ${filename}:`, err)
            reject(err)
          }
        },
      }).connect(destination)
    })
  })
}

/** Dispose all dynamic samplers (free AudioContext memory). */
export function disposeDynamicSamplers(samplers: DynamicSamplers): void {
  Object.values(samplers).forEach((s) => s.dispose())
}

/**
 * Trigger a sample by trackId. Falls back gracefully if sampler isn't ready.
 */
export function triggerDynamicSampler(
  samplers: DynamicSamplers,
  trackId: TrackId,
  _noteLen: string,   // resolution (unused for one-shot samples)
  time: number,
  velocity: number
): void {
  const sampler = samplers[trackId]
  if (!sampler?.loaded) return
  // Use a long release ('1n' = one bar) so the sample always plays to
  // natural completion, regardless of grid resolution. The Sampler will
  // release gracefully when the sample's own envelope ends.
  sampler.triggerAttackRelease('C4', '1n', time, velocity)
}
