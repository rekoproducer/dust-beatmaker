// ── DUST Album Stem Banks (replaces DrumMachine) ─────────────────────────────
export type StemBank = 'core-command' | 'sinter' | 'dust' | 'particles'

export interface StemBankConfig {
  id: StemBank
  label: string
  folder: string             // under /public/audio/stems/
  color: string              // accent color hex
  bgGlow: string             // CSS rgba for background orb
  bgGlow2: string            // secondary orb
}

export const STEM_BANKS: StemBankConfig[] = [
  {
    id: 'core-command',
    label: '01-Core Command',
    folder: '01-core-command',
    color: '#C5A059',
    bgGlow:  'rgba(197, 160, 89,  0.09)',
    bgGlow2: 'rgba(232, 131, 42,  0.06)',
  },
  {
    id: 'sinter',
    label: '02-Sinter',
    folder: '02-sinter',
    color: '#7A8A9A',
    bgGlow:  'rgba(40,  44,  55,  0.18)',
    bgGlow2: 'rgba(70,  80,  100, 0.10)',
  },
  {
    id: 'dust',
    label: '03-Dust',
    folder: '03-dust',
    color: '#B09070',
    bgGlow:  'rgba(176, 144, 112, 0.08)',
    bgGlow2: 'rgba(140, 110, 80,  0.06)',
  },
  {
    id: 'particles',
    label: '04-Particles',
    folder: '04-particles',
    color: '#8AABB8',
    bgGlow:  'rgba(90,  120, 145, 0.09)',
    bgGlow2: 'rgba(60,  90,  120, 0.07)',
  },
]

// TRACK_STEM_MAP removed — with dynamic loading, trackId IS the sample filename
// (without .wav extension). One Sampler per track, no mapping needed.
export const TRACK_STEM_MAP: Record<string, string> = {} // kept for test compat

// ── Resolution ────────────────────────────────────────────────────────────────
export type Resolution = '4n' | '16n' | '32n' | '64n'

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  '4n':  '1/4',
  '16n': '1/16',
  '32n': '1/32',
  '64n': '1/64',
}

export const RESOLUTION_STEP_COUNT: Record<Resolution, number> = {
  '4n':  4,
  '16n': 16,
  '32n': 32,
  '64n': 64,
}

export const RESOLUTION_STEP_SIZE: Record<Resolution, number> = {
  '4n':  56,
  '16n': 38,
  '32n': 24,
  '64n': 14,
}

// ── Track ─────────────────────────────────────────────────────────────────────
// TrackId is now a plain string — derived from WAV filename (without extension).
// e.g. "kick", "snare", "bass-hit", "my-custom-perc"
export type TrackId = string

export interface Step {
  active: boolean
  velocity: number
}

export interface Track {
  id: TrackId
  label: string
  steps: Step[]
  muted: boolean
  volume: number
}

// ── Sequencer State ───────────────────────────────────────────────────────────
export interface SequencerState {
  tracks: Track[]
  bpm: number
  currentStep: number
  isPlaying: boolean
  isLoading: boolean         // true while Sampler loads
  stepCount: number
  bank: StemBank             // replaces DrumMachine
  resolution: Resolution
  swing: number
}

export const DEFAULT_STEP_COUNT = 16
export const DEFAULT_BPM = 120
export const DEFAULT_RESOLUTION: Resolution = '16n'
export const DEFAULT_SWING = 0
export const DEFAULT_BANK: StemBank = 'core-command'
