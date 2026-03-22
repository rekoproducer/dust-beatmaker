import * as Tone from 'tone'
import type { DrumMachine, TrackId } from '../sequencer/types'

/**
 * Simple round-robin voice pool for NoiseSynth / MetalSynth.
 * Prevents note cut-off at fast resolutions (1/32, 1/64) by
 * distributing rapid hits across independent synth instances.
 */
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

// ── Public voice shape ───────────────────────────────────────────────────────
export interface MachineVoices {
  kick:         Tone.PolySynth
  snare:        VoicePool<Tone.NoiseSynth>
  hihat_closed: VoicePool<Tone.MetalSynth>
  hihat_open:   VoicePool<Tone.MetalSynth>
  clap:         VoicePool<Tone.NoiseSynth>
  tom_low:      Tone.PolySynth
  tom_mid:      Tone.PolySynth
  tom_high:     Tone.PolySynth
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function membranePoly(opts: Tone.MembraneSynthOptions): Tone.PolySynth {
  return new Tone.PolySynth(Tone.MembraneSynth, { maxPolyphony: 8, ...opts })
}

// ── 808 ─────────────────────────────────────────────────────────────────────
function make808(): MachineVoices {
  return {
    kick: membranePoly({
      pitchDecay: 0.08, octaves: 8,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
    }),
    snare: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 },
    }), 4),
    hihat_closed: new VoicePool(() => new Tone.MetalSynth({
      frequency: 400, harmonicity: 5.1, modulationIndex: 32,
      resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
    }), 4),
    hihat_open: new VoicePool(() => new Tone.MetalSynth({
      frequency: 400, harmonicity: 5.1, modulationIndex: 32,
      resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
    }), 2),
    clap: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
    }), 4),
    tom_low: membranePoly({
      pitchDecay: 0.06, octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    }),
    tom_mid: membranePoly({
      pitchDecay: 0.05, octaves: 3,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
    }),
    tom_high: membranePoly({
      pitchDecay: 0.04, octaves: 2.5,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
    }),
  }
}

// ── 909 ─────────────────────────────────────────────────────────────────────
function make909(): MachineVoices {
  return {
    kick: membranePoly({
      pitchDecay: 0.05, octaves: 6,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
    }),
    snare: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
    }), 4),
    hihat_closed: new VoicePool(() => new Tone.MetalSynth({
      frequency: 600, harmonicity: 5.1, modulationIndex: 40,
      resonance: 5000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
    }), 4),
    hihat_open: new VoicePool(() => new Tone.MetalSynth({
      frequency: 600, harmonicity: 5.1, modulationIndex: 40,
      resonance: 5000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.3, release: 0.08 },
    }), 2),
    clap: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
    }), 4),
    tom_low: membranePoly({
      pitchDecay: 0.05, octaves: 3.5,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.08 },
    }),
    tom_mid: membranePoly({
      pitchDecay: 0.04, octaves: 3,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.07 },
    }),
    tom_high: membranePoly({
      pitchDecay: 0.035, octaves: 2.5,
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.06 },
    }),
  }
}

// ── 707 ─────────────────────────────────────────────────────────────────────
function make707(): MachineVoices {
  return {
    kick: membranePoly({
      pitchDecay: 0.03, octaves: 4,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 },
    }),
    snare: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
    }), 4),
    hihat_closed: new VoicePool(() => new Tone.MetalSynth({
      frequency: 800, harmonicity: 5.1, modulationIndex: 24,
      resonance: 6000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
    }), 4),
    hihat_open: new VoicePool(() => new Tone.MetalSynth({
      frequency: 800, harmonicity: 5.1, modulationIndex: 24,
      resonance: 6000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.2, release: 0.06 },
    }), 2),
    clap: new VoicePool(() => new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 },
    }), 4),
    tom_low: membranePoly({
      pitchDecay: 0.04, octaves: 3,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
    }),
    tom_mid: membranePoly({
      pitchDecay: 0.035, octaves: 2.5,
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.07 },
    }),
    tom_high: membranePoly({
      pitchDecay: 0.03, octaves: 2,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 },
    }),
  }
}

// ── Note mapping ─────────────────────────────────────────────────────────────
export const TRACK_NOTE: Record<TrackId, string | number> = {
  kick: 'C1', snare: 'C2', hihat_closed: 'C3', hihat_open: 'C3',
  clap: 'C3', tom_low: 'F2', tom_mid: 'A2', tom_high: 'C3',
  rim: 'C4', cowbell: 'G3',
}

export function createVoices(machine: DrumMachine): MachineVoices {
  switch (machine) {
    case '707': return make707()
    case '909': return make909()
    default:    return make808()
  }
}

export function disposeVoices(voices: MachineVoices): void {
  Object.values(voices).forEach((v) => v.dispose())
}

/**
 * Trigger a voice — handles PolySynth, VoicePool<NoiseSynth>, VoicePool<MetalSynth>
 */
export function triggerVoice(
  voice: MachineVoices[keyof MachineVoices],
  trackId: TrackId,
  noteLen: string,
  time: number,
  velocity: number
): void {
  const note = TRACK_NOTE[trackId]
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
