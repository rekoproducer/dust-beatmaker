/**
 * Generates a vinyl_crackle.wav placeholder with realistic noise characteristics.
 * 4 seconds, 44100Hz, 16-bit mono — designed to loop seamlessly.
 *
 * Sound design:
 *   - Constant quiet background hiss (white noise at -42dB)
 *   - Random crackle pops (short spikes) ~3-8 per second
 *   - Slow fade in/out at loop boundaries to avoid clicks
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT  = join(ROOT, 'public', 'audio', 'textures', 'vinyl_crackle.wav')

const SAMPLE_RATE  = 44100
const DURATION_SEC = 4
const NUM_SAMPLES  = SAMPLE_RATE * DURATION_SEC

// Seeded LCG random (deterministic — same file every run)
let seed = 0xDEADBEEF
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return (seed / 0xFFFFFFFF) * 2 - 1  // -1 to 1
}

const samples = new Float32Array(NUM_SAMPLES)

// 1. Background hiss — white noise at ~-42dB (amplitude ≈ 0.008)
const hissAmp = 0.008
for (let i = 0; i < NUM_SAMPLES; i++) {
  samples[i] = rand() * hissAmp
}

// 2. Crackle pops — sharp spikes with short exponential decay
const crackleDensity = 5    // avg pops per second
const crackleAmp     = 0.07  // peak amplitude of each pop

for (let i = 0; i < NUM_SAMPLES; i++) {
  // Poisson-like: each sample has a small probability of starting a crackle
  if (Math.abs(rand()) > 1 - (crackleDensity / SAMPLE_RATE)) {
    const polarity = rand() > 0 ? 1 : -1
    const decaySamples = Math.floor(Math.abs(rand()) * 600 + 100)
    for (let j = 0; j < decaySamples && i + j < NUM_SAMPLES; j++) {
      const env = Math.exp(-j / (decaySamples * 0.3))
      samples[i + j] += polarity * crackleAmp * env * (rand() * 0.5 + 0.5)
    }
  }
}

// 3. Smooth loop boundaries (32-sample crossfade to avoid clicks on loop)
const fade = 32
for (let i = 0; i < fade; i++) {
  const t = i / fade
  samples[i]                        *= t        // fade in
  samples[NUM_SAMPLES - 1 - i]      *= t        // fade out
}

// 4. Encode to 16-bit WAV
const dataSize = NUM_SAMPLES * 2
const fileSize = 44 + dataSize
const buf = Buffer.alloc(fileSize)
let o = 0
const str = (s) => { buf.write(s, o, 'ascii'); o += s.length }
const u32 = (v) => { buf.writeUInt32LE(v, o); o += 4 }
const u16 = (v) => { buf.writeUInt16LE(v, o); o += 2 }

str('RIFF'); u32(fileSize - 8); str('WAVE')
str('fmt '); u32(16); u16(1); u16(1)      // PCM, mono
u32(SAMPLE_RATE); u32(SAMPLE_RATE * 2)    // byte rate
u16(2); u16(16)                            // block align, bits
str('data'); u32(dataSize)

for (let i = 0; i < NUM_SAMPLES; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]))
  const int16   = Math.round(clamped * 32767)
  buf.writeInt16LE(int16, o); o += 2
}

mkdirSync(join(ROOT, 'public', 'audio', 'textures'), { recursive: true })
writeFileSync(OUT, buf)
console.log(`✓  public/audio/textures/vinyl_crackle.wav  (${(fileSize / 1024).toFixed(1)} KB, ${DURATION_SEC}s, seeded noise)`)
