import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  toggleStep,
  setStepVelocity,
  setBpm,
  toggleMute,
  setTrackVolume,
  advanceStep,
  clearTrack,
  clearAll,
  setBank,
  setTracks,
  getActiveStepsForCurrentStep,
} from '../../sequencer/sequencer'
import { DEFAULT_BPM, DEFAULT_STEP_COUNT } from '../../sequencer/types'

/** Helper: initial state with pre-populated tracks (simulates post-discovery state) */
function stateWithTracks(ids = ['kick', 'snare', 'hihat_closed', 'hihat_open', 'clap', 'tom_low', 'tom_mid', 'tom_high']) {
  return setTracks(createInitialState(), ids)
}

describe('Sequencer Engine', () => {
  describe('createInitialState', () => {
    it('starts with empty tracks (populated dynamically)', () => {
      const state = createInitialState()
      expect(state.tracks).toHaveLength(0)
    })

    it('starts at step 0, not playing', () => {
      const state = createInitialState()
      expect(state.currentStep).toBe(0)
      expect(state.isPlaying).toBe(false)
    })

    it('defaults to 120 BPM', () => {
      const state = createInitialState()
      expect(state.bpm).toBe(DEFAULT_BPM)
    })

    it('accepts stem bank', () => {
      expect(createInitialState('sinter').bank).toBe('sinter')
      expect(createInitialState('particles').bank).toBe('particles')
    })

    it('starts with isLoading false (scan triggered on mount)', () => {
      expect(createInitialState().isLoading).toBe(false)
    })
  })

  describe('setTracks', () => {
    it('creates tracks from discovered WAV filenames', () => {
      const state = createInitialState()
      const next = setTracks(state, ['kick', 'snare', 'hihat', 'bass-hit'])
      expect(next.tracks).toHaveLength(4)
      expect(next.tracks.map((t) => t.id)).toEqual(['kick', 'snare', 'hihat', 'bass-hit'])
    })

    it('each track gets 16 empty steps', () => {
      const state = createInitialState()
      const next = setTracks(state, ['kick', 'snare'])
      next.tracks.forEach((t) => {
        expect(t.steps).toHaveLength(DEFAULT_STEP_COUNT)
        t.steps.forEach((s) => expect(s.active).toBe(false))
      })
    })

    it('label is derived from filename (uppercase, dashes → spaces)', () => {
      const state = createInitialState()
      const next = setTracks(state, ['bass-hit', 'rim_shot'])
      expect(next.tracks[0].label).toBe('BASS HIT')
      expect(next.tracks[1].label).toBe('RIM SHOT')
    })

    it('resets currentStep to 0', () => {
      let state = createInitialState()
      state = { ...state, currentStep: 7 }
      const next = setTracks(state, ['kick'])
      expect(next.currentStep).toBe(0)
    })

    it('works with any number of tracks (3 or 8)', () => {
      const state = createInitialState()
      expect(setTracks(state, ['a', 'b', 'c']).tracks).toHaveLength(3)
      expect(setTracks(state, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).tracks).toHaveLength(8)
    })
  })

  describe('toggleStep', () => {
    it('activates an inactive step', () => {
      const state = stateWithTracks()
      const next = toggleStep(state, 'kick', 0)
      expect(next.tracks.find((t) => t.id === 'kick')!.steps[0].active).toBe(true)
    })

    it('deactivates an active step', () => {
      const state = stateWithTracks()
      const on = toggleStep(state, 'kick', 0)
      const off = toggleStep(on, 'kick', 0)
      expect(off.tracks.find((t) => t.id === 'kick')!.steps[0].active).toBe(false)
    })

    it('does not mutate original state', () => {
      const state = stateWithTracks()
      toggleStep(state, 'kick', 3)
      expect(state.tracks.find((t) => t.id === 'kick')!.steps[3].active).toBe(false)
    })

    it('only affects the target track', () => {
      const state = stateWithTracks()
      const next = toggleStep(state, 'kick', 0)
      const otherTracks = next.tracks.filter((t) => t.id !== 'kick')
      otherTracks.forEach((track) => {
        expect(track.steps[0].active).toBe(false)
      })
    })
  })

  describe('setStepVelocity', () => {
    it('sets velocity on a specific step', () => {
      const state = stateWithTracks()
      const next = setStepVelocity(state, 'snare', 4, 0.5)
      expect(next.tracks.find((t) => t.id === 'snare')!.steps[4].velocity).toBe(0.5)
    })

    it('clamps velocity to [0, 1]', () => {
      const state = stateWithTracks()
      expect(setStepVelocity(state, 'kick', 0, 1.5).tracks[0].steps[0].velocity).toBe(1)
      expect(setStepVelocity(state, 'kick', 0, -0.5).tracks[0].steps[0].velocity).toBe(0)
    })
  })

  describe('setBpm', () => {
    it('updates BPM', () => {
      const state = createInitialState()
      expect(setBpm(state, 140).bpm).toBe(140)
    })

    it('clamps BPM to [20, 300]', () => {
      const state = createInitialState()
      expect(setBpm(state, 5).bpm).toBe(20)
      expect(setBpm(state, 999).bpm).toBe(300)
    })
  })

  describe('toggleMute', () => {
    it('mutes an unmuted track', () => {
      const state = stateWithTracks()
      const next = toggleMute(state, 'hihat_closed')
      expect(next.tracks.find((t) => t.id === 'hihat_closed')!.muted).toBe(true)
    })

    it('unmutes a muted track', () => {
      const state = stateWithTracks()
      const muted = toggleMute(state, 'snare')
      const unmuted = toggleMute(muted, 'snare')
      expect(unmuted.tracks.find((t) => t.id === 'snare')!.muted).toBe(false)
    })
  })

  describe('setTrackVolume', () => {
    it('sets volume', () => {
      const state = stateWithTracks()
      const next = setTrackVolume(state, 'kick', 0.6)
      expect(next.tracks.find((t) => t.id === 'kick')!.volume).toBeCloseTo(0.6)
    })

    it('clamps to [0, 1]', () => {
      const state = stateWithTracks()
      expect(setTrackVolume(state, 'kick', 2).tracks[0].volume).toBe(1)
      expect(setTrackVolume(state, 'kick', -1).tracks[0].volume).toBe(0)
    })
  })

  describe('advanceStep', () => {
    it('increments currentStep', () => {
      const state = createInitialState()
      expect(advanceStep(state).currentStep).toBe(1)
    })

    it('wraps around after stepCount', () => {
      let state = createInitialState()
      for (let i = 0; i < DEFAULT_STEP_COUNT; i++) state = advanceStep(state)
      expect(state.currentStep).toBe(0)
    })
  })

  describe('clearTrack', () => {
    it('resets all steps in a track to inactive', () => {
      let state = stateWithTracks()
      state = toggleStep(state, 'kick', 0)
      state = toggleStep(state, 'kick', 8)
      state = clearTrack(state, 'kick')
      const kick = state.tracks.find((t) => t.id === 'kick')!
      kick.steps.forEach((step) => expect(step.active).toBe(false))
    })

    it('leaves other tracks untouched', () => {
      let state = stateWithTracks()
      state = toggleStep(state, 'snare', 2)
      state = clearTrack(state, 'kick')
      expect(state.tracks.find((t) => t.id === 'snare')!.steps[2].active).toBe(true)
    })
  })

  describe('clearAll', () => {
    it('clears all tracks and resets step to 0', () => {
      let state = stateWithTracks()
      state = toggleStep(state, 'kick', 3)
      state = toggleStep(state, 'snare', 7)
      state = advanceStep(advanceStep(state))
      state = clearAll(state)
      state.tracks.forEach((track) => {
        track.steps.forEach((step) => expect(step.active).toBe(false))
      })
      expect(state.currentStep).toBe(0)
    })
  })

  describe('setBank', () => {
    it('switches stem bank and sets isLoading=true', () => {
      const state = createInitialState('core-command')
      const next = setBank(state, 'sinter')
      expect(next.bank).toBe('sinter')
      expect(next.isLoading).toBe(true)
    })

    it('supports all four banks', () => {
      const state = createInitialState()
      expect(setBank(state, 'core-command').bank).toBe('core-command')
      expect(setBank(state, 'sinter').bank).toBe('sinter')
      expect(setBank(state, 'dust').bank).toBe('dust')
      expect(setBank(state, 'particles').bank).toBe('particles')
    })
  })

  describe('getActiveStepsForCurrentStep', () => {
    it('returns tracks with active step at currentStep', () => {
      let state = stateWithTracks()
      state = toggleStep(state, 'kick', 0)
      const active = getActiveStepsForCurrentStep(state)
      expect(active.map((t) => t.id)).toContain('kick')
    })

    it('excludes muted tracks', () => {
      let state = stateWithTracks()
      state = toggleStep(state, 'kick', 0)
      state = toggleMute(state, 'kick')
      const active = getActiveStepsForCurrentStep(state)
      expect(active.map((t) => t.id)).not.toContain('kick')
    })

    it('returns empty array when no steps are active', () => {
      const state = stateWithTracks()
      expect(getActiveStepsForCurrentStep(state)).toHaveLength(0)
    })
  })
})
