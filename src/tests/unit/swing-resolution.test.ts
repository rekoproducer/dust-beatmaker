import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  setResolution,
  setSwing,
  computeSwingOffset,
} from '../../sequencer/sequencer'
import { DEFAULT_RESOLUTION, DEFAULT_SWING } from '../../sequencer/types'

describe('Resolution', () => {
  it('defaults to 16n', () => {
    expect(createInitialState().resolution).toBe(DEFAULT_RESOLUTION)
  })

  it('setResolution changes resolution and resets currentStep', () => {
    let state = createInitialState()
    // advance a few steps first
    state = { ...state, currentStep: 5 }
    const next = setResolution(state, '32n')
    expect(next.resolution).toBe('32n')
    expect(next.currentStep).toBe(0)
  })

  it('supports all four resolution values', () => {
    const state = createInitialState()
    expect(setResolution(state, '4n').resolution).toBe('4n')
    expect(setResolution(state, '16n').resolution).toBe('16n')
    expect(setResolution(state, '32n').resolution).toBe('32n')
    expect(setResolution(state, '64n').resolution).toBe('64n')
  })

  it('does not mutate original state', () => {
    const state = createInitialState()
    setResolution(state, '64n')
    expect(state.resolution).toBe('16n')
  })
})

describe('Swing', () => {
  it('defaults to 0', () => {
    expect(createInitialState().swing).toBe(DEFAULT_SWING)
  })

  it('setSwing updates swing value', () => {
    const state = createInitialState()
    expect(setSwing(state, 50).swing).toBe(50)
    expect(setSwing(state, 100).swing).toBe(100)
  })

  it('clamps swing to [0, 100]', () => {
    const state = createInitialState()
    expect(setSwing(state, -10).swing).toBe(0)
    expect(setSwing(state, 150).swing).toBe(100)
  })

  it('does not mutate original state', () => {
    const state = createInitialState()
    setSwing(state, 75)
    expect(state.swing).toBe(0)
  })
})

describe('computeSwingOffset', () => {
  const stepDur = 0.125 // 16th note at 120 BPM = 0.125s

  it('returns 0 for even steps (on-beats)', () => {
    expect(computeSwingOffset(0, 50, stepDur)).toBe(0)
    expect(computeSwingOffset(2, 50, stepDur)).toBe(0)
    expect(computeSwingOffset(14, 50, stepDur)).toBe(0)
  })

  it('returns 0 when swing is 0', () => {
    expect(computeSwingOffset(1, 0, stepDur)).toBe(0)
    expect(computeSwingOffset(3, 0, stepDur)).toBe(0)
  })

  it('delays odd steps (off-beats) when swing > 0', () => {
    const offset = computeSwingOffset(1, 50, stepDur)
    expect(offset).toBeGreaterThan(0)
  })

  it('delay scales linearly with swing amount', () => {
    const offset50 = computeSwingOffset(1, 50, stepDur)
    const offset100 = computeSwingOffset(1, 100, stepDur)
    expect(offset100).toBeCloseTo(offset50 * 2, 5)
  })

  it('max swing (100%) delay = 2/3 × stepDuration', () => {
    const expected = (2 / 3) * stepDur
    expect(computeSwingOffset(1, 100, stepDur)).toBeCloseTo(expected, 6)
  })

  it('delay is same for all odd steps (step-independent)', () => {
    const o1 = computeSwingOffset(1, 66, stepDur)
    const o3 = computeSwingOffset(3, 66, stepDur)
    const o7 = computeSwingOffset(7, 66, stepDur)
    expect(o1).toBeCloseTo(o3, 6)
    expect(o3).toBeCloseTo(o7, 6)
  })
})
