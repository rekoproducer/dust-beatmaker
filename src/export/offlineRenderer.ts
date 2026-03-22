import * as Tone from 'tone'
import { createVoices, triggerVoice } from '../engine/synths'
import type { SequencerState, TrackId } from '../sequencer/types'
import { computeSwingOffset } from '../sequencer/sequencer'

export interface RenderOptions {
  dustFx?: boolean     // apply BitCrusher + High-Pass Filter
  withTexture?: boolean // mix in vinyl_crackle.wav (requires pre-fetch)
}

function stepDurationSec(bpm: number, resolution: string): number {
  const beatsPerSec = bpm / 60
  const noteValues: Record<string, number> = {
    '4n': 1, '16n': 0.25, '32n': 0.125, '64n': 0.0625,
  }
  return (noteValues[resolution] ?? 0.25) / beatsPerSec
}

/**
 * Pre-fetch the vinyl texture as a decoded AudioBuffer.
 * Needed because Tone.Offline can't load URLs — all buffers must be
 * provided as pre-decoded data.
 */
async function fetchTextureBuffer(): Promise<AudioBuffer | null> {
  try {
    const res = await fetch('/audio/textures/vinyl_crackle.wav')
    if (!res.ok) return null
    const raw = await res.arrayBuffer()
    // Use a temporary AudioContext just for decoding
    const ctx = new AudioContext()
    const decoded = await ctx.decodeAudioData(raw)
    await ctx.close()
    return decoded
  } catch {
    console.warn('[offlineRenderer] could not fetch vinyl_crackle.wav — exporting without texture')
    return null
  }
}

/**
 * Renders one full loop offline with optional DUST FX and vinyl texture.
 * Swing is applied via manual timing math (Tone.Offline transport doesn't
 * support swing natively).
 */
export async function renderLoop(
  state: SequencerState,
  options: RenderOptions = {}
): Promise<AudioBuffer> {
  const { dustFx = false, withTexture = dustFx } = options

  const stepDur     = stepDurationSec(state.bpm, state.resolution)
  const totalDuration = stepDur * state.stepCount + 1.0

  // Pre-fetch texture buffer before entering offline context
  const textureBuffer = withTexture ? await fetchTextureBuffer() : null

  const buffer = await Tone.Offline(({ transport }) => {
    // ── Output node (FX chain or direct) ────────────────────────────────────
    let outputNode: Tone.ToneAudioNode

    if (dustFx) {
      const bitCrusher = new Tone.BitCrusher(8)
      const hpFilter   = new Tone.Filter({ frequency: 300, type: 'highpass', rolloff: -12 })
      bitCrusher.connect(hpFilter)
      hpFilter.toDestination()
      outputNode = bitCrusher
    } else {
      outputNode = Tone.getDestination()
    }

    // ── Drum voices ──────────────────────────────────────────────────────────
    const voices = createVoices(state.machine)
    Object.values(voices).forEach((v) => v.connect(outputNode))

    transport.bpm.value = state.bpm

    state.tracks.forEach((track) => {
      if (track.muted) return
      track.steps.forEach((step, stepIndex) => {
        if (!step.active) return
        const voice = voices[track.id as keyof typeof voices]
        if (!voice) return
        const swingDelay = computeSwingOffset(stepIndex, state.swing, stepDur)
        const time       = stepIndex * stepDur + swingDelay
        const vel        = step.velocity * track.volume
        triggerVoice(voice, track.id as TrackId, state.resolution, time, vel)
      })
    })

    // ── Vinyl texture (looped, at -30dB) ─────────────────────────────────────
    if (textureBuffer) {
      const textureVol = new Tone.Volume(-30).connect(outputNode)
      // Manually loop by scheduling multiple iterations across the render duration
      const textureDur = textureBuffer.duration
      let t = 0
      while (t < totalDuration) {
        const src = new Tone.ToneBufferSource(
          new Tone.ToneAudioBuffer(textureBuffer)
        ).connect(textureVol)
        src.start(t)
        t += textureDur
      }
    }

    transport.start()
  }, totalDuration)

  return buffer
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
