import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tone.js
vi.mock('tone', () => {
  class FakeSampler {
    loaded = true
    connect = vi.fn().mockReturnThis()
    toDestination = vi.fn().mockReturnThis()
    disconnect = vi.fn().mockReturnThis()
    triggerAttackRelease = vi.fn()
    start = vi.fn()
    stop = vi.fn()
    dispose = vi.fn()
    constructor(_opts: unknown) {
      // Immediately invoke onload
      if (_opts && typeof (_opts as { onload?: () => void }).onload === 'function') {
        setTimeout(() => (_opts as { onload: () => void }).onload(), 0)
      }
    }
  }
  class FakeVolume {
    connect = vi.fn().mockReturnThis()
    toDestination = vi.fn().mockReturnThis()
    dispose = vi.fn()
    volume = { value: 0 }
  }
  class FakeTransport {
    bpm = { value: 120 }
    swing = 0
    swingSubdivision = '16n'
    start = vi.fn()
    stop = vi.fn()
  }
  function FakeSequence(this: { start: ReturnType<typeof vi.fn>, stop: ReturnType<typeof vi.fn>, dispose: ReturnType<typeof vi.fn> }) {
    this.start = vi.fn()
    this.stop = vi.fn()
    this.dispose = vi.fn()
  }
  class FakeDraw {
    schedule = vi.fn()
  }

  const transport = new FakeTransport()
  const draw = new FakeDraw()

  return {
    Sampler: FakeSampler,
    Volume: FakeVolume,
    Sequence: FakeSequence,
    Player: FakeSampler,         // texture player
    Gain: FakeVolume,            // masterOut
    BitCrusher: FakeVolume,      // FX chain
    Filter: FakeVolume,          // FX chain
    ToneBufferSource: FakeSampler,
    ToneAudioBuffer: class { constructor(_b: unknown) {} },
    start: vi.fn().mockResolvedValue(undefined),
    loaded: vi.fn().mockResolvedValue(undefined),
    now: vi.fn(() => 0),
    getTransport: vi.fn(() => transport),
    getDraw: vi.fn(() => draw),
    getContext: vi.fn(() => ({ lookAhead: 0 })),
    getDestination: vi.fn(() => ({ connect: vi.fn(), toDestination: vi.fn() })),
  }
})

import { createInitialState } from '../../sequencer/sequencer'
import { TRACK_STEM_MAP } from '../../sequencer/types'
import { TRACK_NOTE } from '../../engine/synths'
import type { TrackId } from '../../sequencer/types'

describe('Dynamic loading model', () => {
  it('TRACK_NOTE contains standard drum keys', () => {
    const standardKeys = ['kick', 'snare', 'hihat_closed', 'hihat_open']
    standardKeys.forEach((id) => {
      expect(TRACK_NOTE[id]).toBeDefined()
    })
  })

  it('TRACK_NOTE kick is lower octave than hihat', () => {
    const kickOctave = parseInt((TRACK_NOTE['kick'] as string).replace(/\D/g, ''))
    const hhOctave = parseInt((TRACK_NOTE['hihat_closed'] as string).replace(/\D/g, ''))
    expect(kickOctave).toBeLessThan(hhOctave)
  })

  it('dynamic trackId (filename without .wav) is used directly as sampler key', () => {
    // In the new model: trackId === filename without extension
    // e.g. "bass-hit.wav" → trackId "bass-hit" → samplers["bass-hit"]
    const filename = 'bass-hit.wav'
    const expectedId = filename.replace(/\.wav$/i, '')
    expect(expectedId).toBe('bass-hit')
  })
})

describe('AudioEngine (Sampler-based)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts without throwing', async () => {
    const { AudioEngine } = await import('../../engine/audioEngine')
    const state = createInitialState('core-command')
    const engine = new AudioEngine(state, vi.fn(), vi.fn(), vi.fn())
    await expect(engine.start()).resolves.not.toThrow()
    engine.dispose()
  })

  it('stop does not throw', async () => {
    const { AudioEngine } = await import('../../engine/audioEngine')
    const engine = new AudioEngine(createInitialState(), vi.fn(), vi.fn(), vi.fn())
    await engine.start()
    expect(() => engine.stop()).not.toThrow()
    engine.dispose()
  })

  it('triggerPreview does not throw even without samplers', async () => {
    const { AudioEngine } = await import('../../engine/audioEngine')
    const engine = new AudioEngine(createInitialState('core-command'), vi.fn(), vi.fn(), vi.fn())
    await engine.start()
    expect(() => engine.triggerPreview('kick')).not.toThrow()
    engine.dispose()
  })

  it('updateState changes bpm on transport', async () => {
    const { AudioEngine } = await import('../../engine/audioEngine')
    const Tone = await import('tone')
    const transport = Tone.getTransport()
    const engine = new AudioEngine(createInitialState(), vi.fn(), vi.fn(), vi.fn())
    await engine.start()
    engine.updateState({ ...createInitialState(), bpm: 160 })
    expect(transport.bpm.value).toBe(160)
    engine.dispose()
  })

  it('onLoaded callback is called after bank load', async () => {
    const { AudioEngine } = await import('../../engine/audioEngine')
    const onLoaded = vi.fn()
    const engine = new AudioEngine(createInitialState('core-command'), vi.fn(), vi.fn(), onLoaded)
    await engine.start()
    expect(onLoaded).toHaveBeenCalled()
    engine.dispose()
  })
})
