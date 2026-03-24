import * as Tone from 'tone'

/**
 * Signal chain:
 *   masterVol → dustLPF → dustHPF → [FX: bitCrusher → fxHP] → masterOut → Tone.Destination
 *                                    [clean: direct]                     → MediaStreamDest (rec)
 *
 * masterOut is a permanent gain node — the single final tap point.
 * Connecting it to a MediaStreamDestinationNode captures everything live.
 */
export class AtmosphericEngine {
  private texturePlayer: Tone.Player | null = null
  private textureVol: Tone.Volume

  // DUST FILTER — always in chain
  private dustLPF: Tone.Filter
  private dustHPF: Tone.Filter

  // DUST FX — bypass until toggled
  private bitCrusher: Tone.BitCrusher
  private fxHP: Tone.Filter
  private fxActive = false

  // Permanent final node — the single output tap
  private masterOut: Tone.Gain

  // Stutter FX — gates masterOut.gain at 1/32n rate
  private stutterSeq: Tone.Sequence | null = null
  private stuttering = false

  // Recording destination (created on demand)
  private recordingDest: MediaStreamAudioDestinationNode | null = null

  readonly masterVol: Tone.Volume

  constructor(masterVol: Tone.Volume) {
    this.masterVol = masterVol

    this.textureVol = new Tone.Volume(-30)

    // Permanent final output node
    this.masterOut = new Tone.Gain(1)
    this.masterOut.toDestination()

    // DUST FILTER
    this.dustLPF = new Tone.Filter({ frequency: 20000, type: 'lowpass',  rolloff: -12 })
    this.dustHPF = new Tone.Filter({ frequency: 20,    type: 'highpass', rolloff: -12 })
    this.dustLPF.connect(this.dustHPF)
    this.dustHPF.connect(this.masterOut)

    // DUST FX chain (bypass until activated)
    this.bitCrusher = new Tone.BitCrusher(8)
    this.fxHP = new Tone.Filter({ frequency: 300, type: 'highpass', rolloff: -12 })
    this.bitCrusher.connect(this.fxHP)
    this.fxHP.connect(this.masterOut)

    // Default clean routing: masterVol → dustLPF → dustHPF → masterOut
    this.masterVol.connect(this.dustLPF)

    // Texture connects to masterOut too (captured in recording)
    this.textureVol.connect(this.masterOut)
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  /** Returns a live MediaStream tapped from masterOut — captures all audio. */
  getRecordingStream(): MediaStream {
    if (!this.recordingDest) {
      const ctx = Tone.getContext().rawContext as AudioContext
      this.recordingDest = ctx.createMediaStreamDestination()
      // Connect masterOut to the recording destination in parallel
      this.masterOut.connect(this.recordingDest as unknown as Tone.ToneAudioNode)
    }
    return this.recordingDest.stream
  }

  // ── Vinyl texture ──────────────────────────────────────────────────────────

  async startTexture(): Promise<void> {
    if (this.texturePlayer) return
    try {
      this.texturePlayer = new Tone.Player({
        url: `${import.meta.env.BASE_URL ?? '/'}audio/textures/vinyl_crackle.wav`,
        loop: true,
      }).connect(this.textureVol)
      await Tone.loaded()
      this.texturePlayer.start()
      console.log('[atmosphere] vinyl texture started')
    } catch (err) {
      console.warn('[atmosphere] could not load vinyl_crackle.wav:', err)
    }
  }

  // ── DUST FX toggle ─────────────────────────────────────────────────────────

  setFxActive(active: boolean): void {
    if (active === this.fxActive) return
    this.fxActive = active
    this.dustHPF.disconnect()
    if (active) {
      this.dustHPF.connect(this.bitCrusher)
      void this.startTexture()
      console.log('[atmosphere] DUST FX ON')
    } else {
      this.dustHPF.connect(this.masterOut)
      this.stopTexture()
      console.log('[atmosphere] DUST FX OFF')
    }
  }

  get isFxActive(): boolean { return this.fxActive }

  // ── DUST FILTER ────────────────────────────────────────────────────────────

  setLpf(pct: number): void {
    const freq = 200 * Math.pow(100, pct / 100)
    this.dustLPF.frequency.rampTo(Math.min(20000, Math.max(200, freq)), 0.05)
  }

  setHpf(pct: number): void {
    const freq = 20 * Math.pow(100, pct / 100)
    this.dustHPF.frequency.rampTo(Math.min(2000, Math.max(20, freq)), 0.05)
  }

  // ── Stutter FX ────────────────────────────────────────────────────────────

  /**
   * Gate masterOut.gain at 1/32n rate: [1, 0, 1, 0, …]
   * Runs entirely in the audio thread → sample-accurate, captured by recorder.
   *
   * Pattern options (change subdivision for feel):
   *   '1/32n' = tight stutter (2 chops per 1/16n)
   *   '1/64n' = ultra glitch
   */
  startStutter(subdivision: '1/32n' | '1/64n' = '1/32n'): void {
    if (this.stuttering) return
    this.stuttering = true

    let phase = true
    this.stutterSeq = new Tone.Sequence(
      (time) => {
        // Toggle gain at audio-thread precision
        this.masterOut.gain.setValueAtTime(phase ? 1 : 0, time)
        phase = !phase
      },
      [0],        // single dummy value — fires once per subdivision
      subdivision
    )
    this.stutterSeq.start(0)
    console.log(`[stutter] ON @ ${subdivision}`)
  }

  stopStutter(): void {
    if (!this.stuttering) return
    this.stuttering = false

    this.stutterSeq?.stop()
    this.stutterSeq?.dispose()
    this.stutterSeq = null

    // Restore gain immediately — cancel any pending scheduled values
    const now = Tone.now()
    this.masterOut.gain.cancelScheduledValues(now)
    this.masterOut.gain.setValueAtTime(1, now)
    console.log('[stutter] OFF')
  }

  get isStuttering(): boolean { return this.stuttering }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  stopTexture(): void {
    this.texturePlayer?.stop()
    this.texturePlayer?.dispose()
    this.texturePlayer = null
  }

  dispose(): void {
    this.stopStutter()
    this.stopTexture()
    this.textureVol.dispose()
    this.dustLPF.dispose()
    this.dustHPF.dispose()
    this.bitCrusher.dispose()
    this.fxHP.dispose()
    this.masterOut.dispose()
  }
}
