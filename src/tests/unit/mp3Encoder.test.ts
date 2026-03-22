import { describe, it, expect, vi } from 'vitest'

// Mock lamejs — no native binary in test environment
vi.mock('lamejs', () => {
  return {
    default: {
      Mp3Encoder: class {
        encodeBuffer(_left: Int16Array, _right?: Int16Array) {
          // Return a small fake MP3 chunk
          return new Int8Array([0xff, 0xfb, 0x90, 0x00])
        }
        flush() {
          return new Int8Array([0x00])
        }
      },
    },
  }
})

import { encodeMp3 } from '../../export/mp3Encoder'

function makeFakeBuffer(samples: number, channels: number, sampleRate = 44100): AudioBuffer {
  return {
    length: samples,
    numberOfChannels: channels,
    sampleRate,
    duration: samples / sampleRate,
    getChannelData: (_ch: number) => new Float32Array(samples).fill(0.3),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer
}

describe('MP3 Encoder', () => {
  it('returns a Blob with audio/mp3 type', () => {
    const blob = encodeMp3(makeFakeBuffer(44100, 2))
    expect(blob.type).toBe('audio/mp3')
  })

  it('produces non-empty output', () => {
    const blob = encodeMp3(makeFakeBuffer(4096, 2))
    expect(blob.size).toBeGreaterThan(0)
  })

  it('works with mono buffer', () => {
    const blob = encodeMp3(makeFakeBuffer(4096, 1))
    expect(blob.size).toBeGreaterThan(0)
  })

  it('accepts different kbps rates', () => {
    const buf = makeFakeBuffer(2048, 2)
    expect(() => encodeMp3(buf, 128)).not.toThrow()
    expect(() => encodeMp3(buf, 256)).not.toThrow()
    expect(() => encodeMp3(buf, 320)).not.toThrow()
  })

  it('handles silent buffer without throwing', () => {
    const silent = {
      length: 1000,
      numberOfChannels: 2,
      sampleRate: 44100,
      duration: 1000 / 44100,
      getChannelData: () => new Float32Array(1000).fill(0),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer
    expect(() => encodeMp3(silent)).not.toThrow()
  })
})
