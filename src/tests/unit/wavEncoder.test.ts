import { describe, it, expect } from 'vitest'
import { encodeWav } from '../../export/wavEncoder'

function makeFakeBuffer(
  samples: number,
  channels: number,
  sampleRate: number,
  fill = 0.5
): AudioBuffer {
  return {
    length: samples,
    numberOfChannels: channels,
    sampleRate,
    duration: samples / sampleRate,
    getChannelData: (_ch: number) => new Float32Array(samples).fill(fill),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer
}

describe('WAV Encoder', () => {
  it('returns a Blob with audio/wav type', () => {
    const buf = makeFakeBuffer(44100, 2, 44100)
    const blob = encodeWav(buf)
    expect(blob.type).toBe('audio/wav')
  })

  it('output size matches expected WAV layout', () => {
    // 44 byte header + samples * channels * 2 bytes (16-bit)
    const samples = 100
    const channels = 2
    const blob = encodeWav(makeFakeBuffer(samples, channels, 44100))
    expect(blob.size).toBe(44 + samples * channels * 2)
  })

  it('works with mono buffer', () => {
    const blob = encodeWav(makeFakeBuffer(1000, 1, 44100))
    expect(blob.size).toBe(44 + 1000 * 1 * 2)
  })

  it('handles silence (all zeros)', () => {
    const blob = encodeWav(makeFakeBuffer(512, 2, 44100, 0))
    expect(blob.size).toBeGreaterThan(44)
  })

  it('clamps values above 1.0 without throwing', () => {
    const buf = makeFakeBuffer(100, 1, 44100, 1.5)
    expect(() => encodeWav(buf)).not.toThrow()
  })

  it('clamps values below -1.0 without throwing', () => {
    const buf = makeFakeBuffer(100, 1, 44100, -2.0)
    expect(() => encodeWav(buf)).not.toThrow()
  })

  it('writes RIFF header correctly', async () => {
    const samples = 10
    const blob = encodeWav(makeFakeBuffer(samples, 1, 44100))
    const arrayBuffer = await blob.arrayBuffer()
    const view = new DataView(arrayBuffer)

    // "RIFF"
    expect(view.getUint8(0)).toBe('R'.charCodeAt(0))
    expect(view.getUint8(1)).toBe('I'.charCodeAt(0))
    expect(view.getUint8(2)).toBe('F'.charCodeAt(0))
    expect(view.getUint8(3)).toBe('F'.charCodeAt(0))

    // "WAVE"
    expect(view.getUint8(8)).toBe('W'.charCodeAt(0))
    expect(view.getUint8(9)).toBe('A'.charCodeAt(0))
    expect(view.getUint8(10)).toBe('V'.charCodeAt(0))
    expect(view.getUint8(11)).toBe('E'.charCodeAt(0))
  })

  it('encodes sample rate correctly in header', async () => {
    const blob = encodeWav(makeFakeBuffer(100, 1, 48000))
    const view = new DataView(await blob.arrayBuffer())
    expect(view.getUint32(24, true)).toBe(48000)
  })

  it('writes "fmt " and "data" chunk markers', async () => {
    const blob = encodeWav(makeFakeBuffer(10, 1, 44100))
    const view = new DataView(await blob.arrayBuffer())

    const readStr = (offset: number) =>
      String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)))

    expect(readStr(12)).toBe('fmt ')
    expect(readStr(36)).toBe('data')
  })
})
