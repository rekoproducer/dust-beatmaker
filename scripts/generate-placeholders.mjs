/**
 * Generates silent placeholder WAV files for each DUST stem bank.
 * Run: node scripts/generate-placeholders.mjs
 *
 * Replace each file with your final WAV stems when ready.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/**
 * Creates a minimal valid WAV buffer (silent, 16-bit PCM, mono).
 * 0.5s at 44100Hz = 44,100 samples = 88,200 bytes of audio data.
 */
function makeSilentWav(durationSec = 0.5, sampleRate = 44100) {
  const numChannels  = 1
  const bitsPerSample = 16
  const numSamples   = Math.floor(durationSec * sampleRate)
  const blockAlign   = numChannels * (bitsPerSample / 8)
  const byteRate     = sampleRate * blockAlign
  const dataSize     = numSamples * blockAlign
  const fileSize     = 44 + dataSize

  const buf = Buffer.alloc(fileSize, 0)
  let o = 0

  const str = (s)  => { buf.write(s, o, 'ascii'); o += s.length }
  const u32 = (v)  => { buf.writeUInt32LE(v, o); o += 4 }
  const u16 = (v)  => { buf.writeUInt16LE(v, o); o += 2 }

  str('RIFF'); u32(fileSize - 8); str('WAVE')
  str('fmt '); u32(16); u16(1 /* PCM */); u16(numChannels)
  u32(sampleRate); u32(byteRate); u16(blockAlign); u16(bitsPerSample)
  str('data'); u32(dataSize)
  // Remaining bytes are already 0 = silence

  return buf
}

const BANKS = ['track1-sand', 'track2-void', 'track3-dust', 'track4-echo']
const SAMPLES = ['kick.wav', 'snare.wav', 'hihat.wav', 'perc.wav']

const wav = makeSilentWav()

for (const bank of BANKS) {
  const dir = join(ROOT, 'public', 'audio', 'stems', bank)
  mkdirSync(dir, { recursive: true })
  for (const sample of SAMPLES) {
    writeFileSync(join(dir, sample), wav)
    console.log(`✓  public/audio/stems/${bank}/${sample}  (${wav.byteLength} bytes, silent)`)
  }
}

console.log('\nDone. Replace each file with your final WAV when ready.')
