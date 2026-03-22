/**
 * DustRecorder — wraps the browser's MediaRecorder API.
 *
 * Connects to the masterOut node (end of the audio chain) via a
 * MediaStreamAudioDestinationNode, so every live change
 * (filter sweeps, FX, bank switches) is captured in real time.
 */
export class DustRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private mimeType: string

  constructor() {
    // Pick best supported container, prefer opus for quality/size ratio
    this.mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  get extension(): string {
    return this.mimeType.includes('ogg') ? 'ogg' : 'webm'
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /** Begin recording from the provided MediaStream. */
  start(stream: MediaStream): void {
    if (this.isRecording) return
    this.chunks = []

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType:     this.mimeType || undefined,
      bitsPerSecond: 192_000,
    })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.start(100) // collect chunks every 100 ms
    console.log(`[recorder] started — ${this.mimeType || 'default codec'}`)
  }

  /**
   * Stop recording and download the result.
   * Returns the filename for display purposes.
   */
  stop(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) { resolve(''); return }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' })
        const filename = `rekobeats-DUST-session.${this.extension}`
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        console.log(`[recorder] saved ${filename} (${(blob.size / 1024).toFixed(0)} KB)`)
        resolve(filename)
      }

      this.mediaRecorder.stop()
    })
  }

  dispose(): void {
    if (this.isRecording) this.mediaRecorder?.stop()
    this.mediaRecorder = null
    this.chunks = []
  }
}
