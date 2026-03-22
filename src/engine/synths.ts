/**
 * Legacy synthesis engine — used only by offlineRenderer.ts for WAV/MP3 export.
 * Live playback now uses Tone.Sampler via stemLoader.ts.
 */
import * as Tone from 'tone'
import type { TrackId } from '../sequencer/types'

class VoicePool<T extends Tone.NoiseSynth | Tone.MetalSynth> {
  private voices: T[]
  private idx = 0

  constructor(create: () => T, size: number) {
    this.voices = Array.from({ length: size }, create)
  }

  next(): T {
    const v = this.voices[this.idx]
    this.idx = (this.idx + 1) % this.voices.length
    return v
  }

  connect(dest: Tone.ToneAudioNode): this {
    this.voices.forEach((v) => v.connect(dest))
    return this
  }

  dispose(): void {
    this.voices.forEach((v) => v.dispose())
  }
}

export interface MachineVoices {
  kick:         Tone.PolySynth<Tone.MembraneSynth>
  snare:        VoicePool<Tone.NoiseSynth>
  hihat_closed: VoicePool<Tone.MetalSynth>
  hihat_open:   VoicePool<Tone.MetalSynth>
  clap:         VoicePool<Tone.NoiseSynth>
  tom_low:      Tone.PolySynth<Tone.MembraneSynth>
  tom_mid:      Tone.PolySynth<Tone.MembraneSynth>
  tom_high:     Tone.PolySynth<Tone.MembraneSynth>
}

function membranePoly(pitchDecay: number, octaves: number, decay: number): Tone.PolySynth<Tone.MembraneSynth> {
  const poly = new Tone.PolySynth(Tone.MembraneSynth)
  poly.set({ pitchDecay, octaves, envelope: { attack: 0.001, decay, sustain: 0, release: decay * 0.5 } })
  return poly
}

function metalPool(freq: number, harmonicity: number, modIdx: number, resonance: number, decay: number, size: number): VoicePool<Tone.MetalSynth> {
  return new VoicePool(() => {
    const s = new Tone.MetalSynth({ harmonicity, modulationIndex: modIdx, resonance, octaves: 1.5 })
    s.frequency.value = freq
    s.envelope.decay   = decay
    s.envelope.release = decay * 0.2
    return s
  }, size)
}

function noisePool(type: 'white' | 'pink' | 'brown', attack: number, decay: number, size: number): VoicePool<Tone.NoiseSynth> {
  return new VoicePool(() => new Tone.NoiseSynth({
    noise: { type },
    envelope: { attack, decay, sustain: 0, release: decay * 0.5 },
  }), size)
}

function make808(): MachineVoices {
  return {
    kick:         membranePoly(0.08, 8, 0.4),
    snare:        noisePool('white', 0.001, 0.22, 4),
    hihat_closed: metalPool(400, 5.1, 32, 4000, 0.06, 4),
    hihat_open:   metalPool(400, 5.1, 32, 4000, 0.4,  2),
    clap:         noisePool('pink',  0.005, 0.1, 4),
    tom_low:      membranePoly(0.06, 4,   0.3),
    tom_mid:      membranePoly(0.05, 3,   0.25),
    tom_high:     membranePoly(0.04, 2.5, 0.2),
  }
}

function make909(): MachineVoices {
  return {
    kick:         membranePoly(0.05, 6, 0.28),
    snare:        noisePool('white', 0.001, 0.15, 4),
    hihat_closed: metalPool(600, 5.1, 40, 5000, 0.04, 4),
    hihat_open:   metalPool(600, 5.1, 40, 5000, 0.3,  2),
    clap:         noisePool('white', 0.001, 0.08, 4),
    tom_low:      membranePoly(0.05, 3.5, 0.22),
    tom_mid:      membranePoly(0.04, 3,   0.18),
    tom_high:     membranePoly(0.035, 2.5, 0.14),
  }
}

function make707(): MachineVoices {
  return {
    kick:         membranePoly(0.03, 4, 0.18),
    snare:        noisePool('brown', 0.001, 0.18, 4),
    hihat_closed: metalPool(800, 5.1, 24, 6000, 0.03, 4),
    hihat_open:   metalPool(800, 5.1, 24, 6000, 0.2,  2),
    clap:         noisePool('pink', 0.001, 0.12, 4),
    tom_low:      membranePoly(0.04, 3,   0.2),
    tom_mid:      membranePoly(0.035, 2.5, 0.16),
    tom_high:     membranePoly(0.03, 2,   0.12),
  }
}

export const TRACK_NOTE: Record<string, string | number> = {
  kick: 'C1', snare: 'C2', hihat_closed: 'C3', hihat_open: 'C3',
  clap: 'C3', tom_low: 'F2', tom_mid: 'A2', tom_high: 'C3',
  rim: 'C4', cowbell: 'G3',
}

/** machine parameter accepts any string — maps to 707/808/909, defaults to 808 */
export function createVoices(machine: string): MachineVoices {
  switch (machine) {
    case '707': return make707()
    case '909': return make909()
    default:    return make808()
  }
}

export function disposeVoices(voices: MachineVoices): void {
  Object.values(voices).forEach((v) => v.dispose())
}

export function triggerVoice(
  voice: MachineVoices[keyof MachineVoices],
  trackId: TrackId,
  noteLen: string,
  time: number,
  velocity: number
): void {
  const note = TRACK_NOTE[trackId] ?? 'C3'
  if (voice instanceof Tone.PolySynth) {
    voice.triggerAttackRelease(note as string, noteLen, time, velocity)
  } else if (voice instanceof VoicePool) {
    const v = voice.next()
    if (v instanceof Tone.NoiseSynth) {
      v.triggerAttackRelease(noteLen, time, velocity)
    } else if (v instanceof Tone.MetalSynth) {
      v.triggerAttackRelease(noteLen, time, velocity)
    }
  }
}
