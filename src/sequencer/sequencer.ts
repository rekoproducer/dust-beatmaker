import type { SequencerState, Track, TrackId, StemBank, Step, Resolution } from './types'
import { DEFAULT_BPM, DEFAULT_STEP_COUNT, DEFAULT_RESOLUTION, DEFAULT_SWING, DEFAULT_BANK, RESOLUTION_STEP_COUNT } from './types'

function makeSteps(count: number): Step[] {
  return Array.from({ length: count }, () => ({ active: false, velocity: 0.8 }))
}

/**
 * Build a label from a filename-derived trackId.
 * "bass-hit" → "BASS HIT", "kick_dry" → "KICK DRY"
 */
function labelFromId(id: TrackId): string {
  return id.replace(/[-_]/g, ' ').toUpperCase()
}

function makeTrack(id: TrackId, stepCount: number): Track {
  return { id, label: labelFromId(id), steps: makeSteps(stepCount), muted: false, volume: 0.8 }
}

export function createInitialState(bank: StemBank = DEFAULT_BANK): SequencerState {
  return {
    tracks: [], // populated dynamically after WAV discovery
    bpm: DEFAULT_BPM,
    currentStep: 0,
    isPlaying: false,
    isLoading: false, // auto-scan triggered by useSequencer on mount
    stepCount: DEFAULT_STEP_COUNT,
    bank,
    resolution: DEFAULT_RESOLUTION,
    swing: DEFAULT_SWING,
  }
}

/**
 * Replace the track list with dynamically discovered WAV files.
 * IMPORTANT: Preserves existing step data for tracks that are already in state.
 * Only creates fresh empty tracks for newly discovered track IDs.
 * This prevents the Play button from wiping the user's pattern.
 */
export function setTracks(state: SequencerState, trackIds: TrackId[]): SequencerState {
  const existingById = new Map(state.tracks.map((t) => [t.id, t]))
  const tracks = trackIds.map((id) => {
    const existing = existingById.get(id)
    if (existing) {
      // Same track — keep all steps the user has set
      return existing
    }
    // New track discovered — start with empty steps
    console.log(`[sequencer] new track discovered: "${id}" — adding empty steps`)
    return makeTrack(id, state.stepCount)
  })
  // Only reset currentStep if this is the very first load (no tracks yet)
  const currentStep = state.tracks.length === 0 ? 0 : state.currentStep
  return { ...state, tracks, currentStep }
}

export function toggleStep(state: SequencerState, trackId: TrackId, stepIndex: number): SequencerState {
  return {
    ...state,
    tracks: state.tracks.map((t) =>
      t.id !== trackId ? t : {
        ...t,
        steps: t.steps.map((s, i) => i !== stepIndex ? s : { ...s, active: !s.active }),
      }
    ),
  }
}

export function setStepVelocity(state: SequencerState, trackId: TrackId, stepIndex: number, velocity: number): SequencerState {
  const clamped = Math.max(0, Math.min(1, velocity))
  return {
    ...state,
    tracks: state.tracks.map((t) =>
      t.id !== trackId ? t : {
        ...t,
        steps: t.steps.map((s, i) => i !== stepIndex ? s : { ...s, velocity: clamped }),
      }
    ),
  }
}

export function setBpm(state: SequencerState, bpm: number): SequencerState {
  return { ...state, bpm: Math.max(20, Math.min(300, bpm)) }
}

export function toggleMute(state: SequencerState, trackId: TrackId): SequencerState {
  return { ...state, tracks: state.tracks.map((t) => t.id !== trackId ? t : { ...t, muted: !t.muted }) }
}

export function setTrackVolume(state: SequencerState, trackId: TrackId, volume: number): SequencerState {
  return { ...state, tracks: state.tracks.map((t) => t.id !== trackId ? t : { ...t, volume: Math.max(0, Math.min(1, volume)) }) }
}

export function advanceStep(state: SequencerState): SequencerState {
  return { ...state, currentStep: (state.currentStep + 1) % state.stepCount }
}

export function clearTrack(state: SequencerState, trackId: TrackId): SequencerState {
  return { ...state, tracks: state.tracks.map((t) => t.id !== trackId ? t : { ...t, steps: makeSteps(state.stepCount) }) }
}

export function clearAll(state: SequencerState): SequencerState {
  return { ...state, tracks: state.tracks.map((t) => ({ ...t, steps: makeSteps(state.stepCount) })), currentStep: 0 }
}

export function setBank(state: SequencerState, bank: StemBank): SequencerState {
  return { ...state, bank, isLoading: true }
}

export function setBankLoaded(state: SequencerState): SequencerState {
  return { ...state, isLoading: false }
}

export function setResolution(state: SequencerState, resolution: Resolution): SequencerState {
  const stepCount = RESOLUTION_STEP_COUNT[resolution]
  const tracks = state.tracks.map((track) => {
    if (track.steps.length === stepCount) return track
    const steps = track.steps.length < stepCount
      ? [...track.steps, ...Array.from({ length: stepCount - track.steps.length }, () => ({ active: false, velocity: 0.8 }))]
      : track.steps.slice(0, stepCount)
    return { ...track, steps }
  })
  return { ...state, resolution, stepCount, currentStep: 0, tracks }
}

export function setSwing(state: SequencerState, swing: number): SequencerState {
  return { ...state, swing: Math.max(0, Math.min(100, swing)) }
}

export function computeSwingOffset(stepIndex: number, swing: number, stepDurationSec: number): number {
  if (swing === 0 || stepIndex % 2 === 0) return 0
  return (swing / 100) * (2 / 3) * stepDurationSec
}

export function getActiveStepsForCurrentStep(state: SequencerState): Track[] {
  return state.tracks.filter((t) => !t.muted && t.steps[state.currentStep]?.active)
}
