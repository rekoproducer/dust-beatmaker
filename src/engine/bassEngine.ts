import * as Tone from 'tone'

export type OscType = 'square' | 'sine' | 'sawtooth'

export interface BassPreset {
  id: string
  name: string
  oscType: OscType
  grit: number      // 0–100  → Distortion 0–1
  cutoff: number    // Hz, 40–2000
  resonance: number // Q,  0–20
  volume: number    // dB, -20–0
  attack: number    // s
  decay: number     // s
  sustain: number   // 0–1
  release: number   // s
}

export const BASS_PRESETS: BassPreset[] = [
  { id: 'deep-rust',     name: 'DEEP RUST',    oscType: 'square',   grit: 40, cutoff: 180, resonance: 4,  volume: -4, attack: 0.01,  decay: 0.15, sustain: 0.85, release: 0.40 },
  { id: 'sub-void',      name: 'SUB VOID',     oscType: 'sine',     grit:  0, cutoff: 120, resonance: 1,  volume: -3, attack: 0.02,  decay: 0.10, sustain: 0.90, release: 0.50 },
  { id: 'crushed-earth', name: 'CRUSHED',      oscType: 'square',   grit: 70, cutoff: 250, resonance: 8,  volume: -6, attack: 0.005, decay: 0.20, sustain: 0.75, release: 0.30 },
  { id: 'mantle-shift',  name: 'MANTLE',       oscType: 'sawtooth', grit: 25, cutoff: 350, resonance: 6,  volume: -5, attack: 0.015, decay: 0.18, sustain: 0.80, release: 0.35 },
  { id: 'basement-vibe', name: 'BASEMENT',     oscType: 'square',   grit: 15, cutoff: 200, resonance: 3,  volume: -5, attack: 0.01,  decay: 0.12, sustain: 0.88, release: 0.45 },
]

// ── Keyboard mapping ──────────────────────────────────────────────────────────
// White keys: A S D F G H J K  →  C D E F G A B C  (one octave)
// Black keys: W E   T Y U      →  C# D#  F# G# A#
// Octave shift: Z = down, X = up
// Conflicts with existing shortcuts (Space/1–4/C/Shift) — none.

export function buildNoteMap(octave: number): Record<string, string> {
  const o = octave
  const o1 = octave + 1
  return {
    // White keys
    'a': `C${o}`,
    's': `D${o}`,
    'd': `E${o}`,
    'f': `F${o}`,
    'g': `G${o}`,
    'h': `A${o}`,
    'j': `B${o}`,
    'k': `C${o1}`,
    // Black keys
    'w': `C#${o}`,
    'e': `D#${o}`,
    't': `F#${o}`,
    'y': `G#${o}`,
    'u': `A#${o}`,
  }
}

// Piano key layout data for visual display
export const KEY_LAYOUT = [
  // Black key row (with gaps where piano has none)
  { row: 'black', key: 'w', label: 'W', note: 'C#', hasSpacer: false },
  { row: 'black', key: 'e', label: 'E', note: 'D#', hasSpacer: false },
  { row: 'black', key: null, label: '', note: '',    hasSpacer: true  }, // E–F gap
  { row: 'black', key: 't', label: 'T', note: 'F#', hasSpacer: false },
  { row: 'black', key: 'y', label: 'Y', note: 'G#', hasSpacer: false },
  { row: 'black', key: 'u', label: 'U', note: 'A#', hasSpacer: false },
  { row: 'black', key: null, label: '', note: '',    hasSpacer: true  }, // B–C gap
] as const

export const WHITE_KEYS = [
  { key: 'a', label: 'A', note: 'C' },
  { key: 's', label: 'S', note: 'D' },
  { key: 'd', label: 'D', note: 'E' },
  { key: 'f', label: 'F', note: 'F' },
  { key: 'g', label: 'G', note: 'G' },
  { key: 'h', label: 'H', note: 'A' },
  { key: 'j', label: 'J', note: 'B' },
  { key: 'k', label: 'K', note: 'C' },
] as const

// ── Signal chain ──────────────────────────────────────────────────────────────
// Synth (osc + ADSR) → Distortion (grit) → Filter (LPF) → Volume → Destination

export class BassEngine {
  private synth: Tone.Synth
  private distortion: Tone.Distortion
  private filter: Tone.Filter
  private masterVol: Tone.Volume

  constructor() {
    this.synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.85, release: 0.4 },
      portamento: 0.04,
    })

    this.distortion = new Tone.Distortion(0.3)
    this.filter     = new Tone.Filter({ frequency: 180, type: 'lowpass', rolloff: -24, Q: 4 })
    this.masterVol  = new Tone.Volume(-4)

    this.synth.connect(this.distortion)
    this.distortion.connect(this.filter)
    this.filter.connect(this.masterVol)
    this.masterVol.toDestination()
  }

  // ── Note events ───────────────────────────────────────────────────────────

  async noteOn(note: string): Promise<void> {
    await Tone.start()
    this.synth.triggerAttack(note)
  }

  noteOff(): void {
    this.synth.triggerRelease()
  }

  // ── Sound controls ────────────────────────────────────────────────────────

  setOscType(type: OscType): void {
    (this.synth.oscillator as Tone.OmniOscillator<Tone.ToneOscillatorType>).type = type
  }

  setGrit(pct: number): void {
    this.distortion.distortion = pct / 100
  }

  setCutoff(hz: number): void {
    this.filter.frequency.rampTo(hz, 0.05)
  }

  setResonance(q: number): void {
    this.filter.Q.rampTo(q, 0.05)
  }

  setVolume(db: number): void {
    this.masterVol.volume.rampTo(db, 0.05)
  }

  // ── Envelope ─────────────────────────────────────────────────────────────

  setAttack(s: number): void  { this.synth.envelope.attack  = s }
  setDecay(s: number): void   { this.synth.envelope.decay   = s }
  setSustain(v: number): void { this.synth.envelope.sustain = v }
  setRelease(s: number): void { this.synth.envelope.release = s }

  // ── Preset ────────────────────────────────────────────────────────────────

  loadPreset(p: BassPreset): void {
    this.setOscType(p.oscType)
    this.setGrit(p.grit)
    this.setCutoff(p.cutoff)
    this.setResonance(p.resonance)
    this.setVolume(p.volume)
    this.setAttack(p.attack)
    this.setDecay(p.decay)
    this.setSustain(p.sustain)
    this.setRelease(p.release)
  }

  // ── Recording integration ─────────────────────────────────────────────────

  private rerouted = false

  /**
   * Reroutes output away from Tone.Destination into the master recording bus.
   * Call once after AudioEngine exists (on first Play press).
   * connectFn = AtmosphericEngine.connectSource, threaded via AudioEngine + useSequencer.
   */
  rerouteOutput(connectFn: (node: Tone.ToneAudioNode) => void): void {
    if (this.rerouted) return
    this.rerouted = true
    this.masterVol.disconnect()   // disconnect from direct Tone.Destination
    connectFn(this.masterVol)     // connect into masterOut → captured by recorder
    console.log('[bassEngine] rerouted to master bus — recording active')
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.synth.dispose()
    this.distortion.dispose()
    this.filter.dispose()
    this.masterVol.dispose()
  }
}
