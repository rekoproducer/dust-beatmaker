// @ts-ignore — lamejs has no official types
import lamejs from 'lamejs'

/**
 * Encodes an AudioBuffer to an MP3 Blob using lamejs.
 * Downmixes to mono if more than one channel.
 */
export function encodeMp3(buffer: AudioBuffer, kbps: 128 | 192 | 256 | 320 = 192): Blob {
  const sampleRate = buffer.sampleRate
  const numChannels = Math.min(buffer.numberOfChannels, 2) as 1 | 2
  const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps)

  const chunkSize = 1152 // lamejs recommended chunk size
  const mp3Data: Int8Array[] = []

  // Convert Float32 [-1, 1] → Int16
  const toInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    }
    return int16
  }

  const leftInt16 = toInt16(buffer.getChannelData(0))
  const rightInt16 = numChannels === 2
    ? toInt16(buffer.getChannelData(1))
    : leftInt16

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const leftChunk = leftInt16.subarray(i, i + chunkSize)
    const rightChunk = rightInt16.subarray(i, i + chunkSize)

    const chunk = numChannels === 2
      ? mp3Encoder.encodeBuffer(leftChunk, rightChunk)
      : mp3Encoder.encodeBuffer(leftChunk)

    if (chunk.length > 0) mp3Data.push(chunk)
  }

  const tail = mp3Encoder.flush()
  if (tail.length > 0) mp3Data.push(tail)

  return new Blob(mp3Data, { type: 'audio/mp3' })
}
