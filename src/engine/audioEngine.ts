import * as Tone from 'tone'
import {
  discoverBankFiles,
  loadDynamicSamplers,
  disposeDynamicSamplers,
  triggerDynamicSampler,
  bankFolder,
} from './stemLoader'
import { AtmosphericEngine } from './atmosphericEngine'
import type { DynamicSamplers } from './stemLoader'
import type { SequencerState, TrackId, StemBank } from '../sequencer/types'
import { getActiveStepsForCurrentStep, advanceStep } from '../sequencer/sequencer'

export type OnStepCallback      = (playingStep: number) => void
export type OnTracksDiscovered  = (trackIds: TrackId[]) => void
export type OnLoadedCallback    = () => void

export class AudioEngine {
  private samplers: DynamicSamplers = {}
  private sequence: Tone.Sequence | null = null
  readonly masterVol: Tone.Volume
  private atmosphere: AtmosphericEngine
  private stateRef: SequencerState
  private onStep: OnStepCallback
  private onTracksDiscovered: OnTracksDiscovered
  private onLoaded: OnLoadedCallback
  private humanize = 0  // 0–100: max timing jitter in ms

  constructor(
    initialState: SequencerState,
    onStep: OnStepCallback,
    onTracksDiscovered: OnTracksDiscovered,
    onLoaded: OnLoadedCallback
  ) {
    this.stateRef          = initialState
    this.onStep            = onStep
    this.onTracksDiscovered = onTracksDiscovered
    this.onLoaded          = onLoaded

    // masterVol routing is fully managed by AtmosphericEngine
    this.masterVol  = new Tone.Volume(0)
    this.atmosphere = new AtmosphericEngine(this.masterVol)
  }

  // ── Atmosphere / FX API ────────────────────────────────────────────────────

  async startAtmosphere(): Promise<void> {
    await this.atmosphere.startTexture()
  }

  setFxActive(active: boolean): void  { this.atmosphere.setFxActive(active) }
  setLpf(pct: number): void           { this.atmosphere.setLpf(pct) }
  setHpf(pct: number): void           { this.atmosphere.setHpf(pct) }
  startStutter(sub?: '1/32n' | '1/64n'): void { this.atmosphere.startStutter(sub) }
  stopStutter(): void                  { this.atmosphere.stopStutter() }

  /** Live recording stream — taps masterOut after all filters/FX. */
  getRecordingStream(): MediaStream    { return this.atmosphere.getRecordingStream() }

  /** Humanize: 0 = robotic grid, 100 = ±20ms random jitter per step */
  setHumanize(value: number): void {
    this.humanize = Math.max(0, Math.min(100, value))
  }

  // ── Bank loading ───────────────────────────────────────────────────────────

  async loadBank(): Promise<void> {
    disposeDynamicSamplers(this.samplers)
    this.samplers = {}

    const folder  = bankFolder(this.stateRef.bank)
    const files   = await discoverBankFiles(folder)
    const trackIds = files.map((f) => f.replace(/\.wav$/i, ''))

    this.onTracksDiscovered(trackIds)
    this.samplers = await loadDynamicSamplers(folder, files, this.masterVol)
    this.onLoaded()
  }

  async switchBank(bank: StemBank): Promise<void> {
    const wasPlaying = !!this.sequence
    if (wasPlaying) this.stop()

    this.stateRef = { ...this.stateRef, bank }
    await this.loadBank()

    if (wasPlaying) await this._startSequence()
  }

  updateState(state: SequencerState): void {
    const bankChanged = state.bank !== this.stateRef.bank

    // CRITICAL: preserve currentStep and isPlaying — these are owned by the
    // audio engine's internal clock. Overwriting them from React state causes
    // the sequencer to jump to a wrong position on every UI interaction.
    this.stateRef = {
      ...state,
      currentStep: this.stateRef.currentStep,
      isPlaying:   this.stateRef.isPlaying,
    }

    const transport = Tone.getTransport()
    transport.bpm.value        = state.bpm
    transport.swing            = state.swing / 100
    transport.swingSubdivision = state.resolution

    if (bankChanged) {
      this.switchBank(state.bank).catch(console.error)
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    await Tone.start()
    Tone.getContext().lookAhead = 0.1

    // Start vinyl texture on first user gesture
    await this.atmosphere.startTexture()

    if (Object.keys(this.samplers).length === 0) {
      await this.loadBank()
    } else {
      console.log('[audioEngine] samplers cached — pattern preserved')
      this.onLoaded()
    }

    await this._startSequence()
  }

  private async _startSequence(): Promise<void> {
    const transport = Tone.getTransport()
    transport.bpm.value        = this.stateRef.bpm
    transport.swing            = this.stateRef.swing / 100
    transport.swingSubdivision = this.stateRef.resolution

    this.sequence = new Tone.Sequence(
      (time) => {
        const playingStep  = this.stateRef.currentStep
        const activeTracks = getActiveStepsForCurrentStep(this.stateRef)

        activeTracks.forEach((track) => {
          const step     = track.steps[playingStep]
          const velocity = (step?.velocity ?? 0.8) * track.volume
          // Humanize: add subtle random timing offset (max ±20ms at 100%)
          const jitter   = this.humanize > 0
            ? (Math.random() * 2 - 1) * (this.humanize / 100) * 0.02
            : 0
          triggerDynamicSampler(
            this.samplers, track.id as TrackId, this.stateRef.resolution, time + jitter, velocity
          )
        })

        this.stateRef = advanceStep(this.stateRef)

        Tone.getDraw().schedule(() => { this.onStep(playingStep) }, time)
      },
      [0],
      this.stateRef.resolution
    )

    this.sequence.start(0)
    transport.start()
  }

  stop(): void {
    Tone.getTransport().stop()
    this.sequence?.stop()
    this.sequence?.dispose()
    this.sequence = null
  }

  triggerPreview(trackId: TrackId, velocity = 0.8): void {
    triggerDynamicSampler(this.samplers, trackId, '8n', Tone.now(), velocity)
  }

  setMasterVolume(db: number): void {
    this.masterVol.volume.value = db
  }

  dispose(): void {
    this.stop()
    this.atmosphere.dispose()
    disposeDynamicSamplers(this.samplers)
    this.masterVol.dispose()
  }
}
