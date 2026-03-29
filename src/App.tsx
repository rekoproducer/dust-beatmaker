import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useSequencer } from './ui/hooks/useSequencer'
import { useKeyboardShortcuts } from './ui/hooks/useKeyboardShortcuts'
import { usePaintMode } from './ui/hooks/usePaintMode'
import { useRecorder } from './ui/hooks/useRecorder'
import { useBass } from './ui/hooks/useBass'
import { RecordButton } from './ui/components/RecordButton'
import { BankSelector } from './ui/components/BankSelector'
import { Transport } from './ui/components/Transport'
import { StepGrid } from './ui/components/StepGrid'
import { ExportPanel } from './ui/components/ExportPanel'
import { ResolutionSelector } from './ui/components/ResolutionSelector'
import { SwingControl } from './ui/components/SwingControl'
import { HumanizeControl } from './ui/components/HumanizeControl'
import { DustFxButton } from './ui/components/DustFxButton'
import { DustFilterPanel } from './ui/components/DustFilterPanel'
import { BassPanel } from './ui/components/BassPanel'
import { InfoOverlay } from './ui/components/InfoOverlay'
import { STEM_BANKS } from './sequencer/types'
import './ui/styles/globals.css'
import styles from './App.module.css'

export default function App() {
  const {
    state, play, stop, switchBank,
    connectBassToMaster,
    setFxActive, setHumanize, setLpf, setHpf,
    startStutter, stopStutter,
    toggleStep, setBpm, toggleMute, setVolume,
    clearTrack, clearAll, switchResolution, setSwing, preview,
    getRecordingStream,
  } = useSequencer('core-command')

  const {
    bassState, isArmed, octave, activeKey,
    toggleArm, octaveDown, octaveUp,
    rerouteOutput,
    loadPreset: loadBassPreset,
    setOscType, setGrit, setCutoff, setResonance, setVolume: setBassVolume,
    setAttack: setBassAttack,
    setDecay:  setBassDecay,
    setSustain: setBassSustain,
    setRelease: setBassRelease,
  } = useBass()

  const { isRecording, elapsed, toast: recToast, start: startRec, stop: stopRec } = useRecorder(getRecordingStream)

  const [dustFxActive, setDustFxActive] = useState(false)
  const [showInfo, setShowInfo]         = useState(false)
  const [humanize, setHumanizeState]    = useState(0)
  const [lpf, setLpfState]              = useState(100)  // 100 = fully open
  const [hpf, setHpfState]              = useState(0)    // 0   = fully open

  const bankConfig = useMemo(
    () => STEM_BANKS.find((b) => b.id === state.bank)!,
    [state.bank]
  )

  const handleFxToggle = (active: boolean) => {
    setDustFxActive(active)
    setFxActive(active)
    document.body.setAttribute('data-dust-fx', String(active))
  }

  const handleHumanize = (v: number) => { setHumanizeState(v); setHumanize(v) }
  const handleLpf      = (v: number) => { setLpfState(v);      setLpf(v) }
  const handleHpf      = (v: number) => { setHpfState(v);      setHpf(v) }

  useEffect(() => () => document.body.removeAttribute('data-dust-fx'), [])

  // ── Bass → master bus routing ──────────────────────────────────────────────
  // On first Play the AudioEngine is created and the recorder tap becomes live.
  // We reroute BassEngine output into that tap so bass is captured in recordings.
  const bassRoutedRef = useRef(false)
  const handlePlay = useCallback(async () => {
    await play()
    if (!bassRoutedRef.current) {
      bassRoutedRef.current = true
      rerouteOutput(connectBassToMaster)
    }
  }, [play, rerouteOutput, connectBassToMaster])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts({ isPlaying: state.isPlaying, play: handlePlay, stop, clearAll, switchBank, startStutter, stopStutter })

  // ── Drag-to-paint ─────────────────────────────────────────────────────────
  const getStepActive = useCallback(
    (trackId: string, stepIndex: number) =>
      state.tracks.find((t) => t.id === trackId)?.steps[stepIndex]?.active ?? false,
    [state.tracks]
  )
  const { onStepMouseDown, onStepMouseEnter } = usePaintMode(toggleStep, getStepActive)

  return (
    <div
      className={styles.app}
      style={{
        '--bank-glow1':  bankConfig.bgGlow,
        '--bank-glow2':  bankConfig.bgGlow2,
        '--bank-accent': bankConfig.color,
      } as React.CSSProperties}
    >
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>DUST — BEATMAKER</h1>
            <span className={styles.subtitle}>{bankConfig.label}</span>
          </div>
          <div className={styles.status}>
            <button
              className={styles.infoBtn}
              onClick={() => setShowInfo(true)}
              aria-label="Show keyboard shortcuts"
              title="Commands & shortcuts"
            >?</button>
            {state.isLoading && (
              <span className={styles.loadingIndicator}>
                <span className={styles.loadingDot} />
                LOADING
              </span>
            )}
            {state.isPlaying && !state.isLoading && (
              <span className={styles.liveIndicator}>
                <span className={styles.liveDot} />
                LIVE
              </span>
            )}
            <span className={styles.stepCounter}>
              STEP {String(state.currentStep + 1).padStart(2, '0')} / {state.stepCount}
            </span>
          </div>
        </header>

        {/* Row 1: Transport + Bank + DUST FX + Export */}
        <div className={`${styles.controlBar} glass`}>
          <Transport
            isPlaying={state.isPlaying}
            bpm={state.bpm}
            onPlay={handlePlay}
            onStop={stop}
            onBpmChange={setBpm}
            onClearAll={clearAll}
          />
          <div className={styles.divider} />
          <BankSelector current={state.bank} isLoading={state.isLoading} onChange={switchBank} />
          <div className={styles.divider} />
          <DustFxButton active={dustFxActive} onChange={handleFxToggle} />
          <div className={styles.divider} />
          <RecordButton
            isRecording={isRecording}
            elapsed={elapsed}
            toast={recToast}
            onStart={startRec}
            onStop={stopRec}
          />
          <div className={styles.divider} />
          <ExportPanel state={state} dustFxActive={dustFxActive} />
        </div>

        {/* Row 2: GRID | SWING + HUMANIZE | DUST FILTER */}
        <div className={`${styles.controlBar2} glass`}>
          {/* GRID */}
          <div className={styles.panelBlock}>
            <ResolutionSelector current={state.resolution} onChange={switchResolution} />
          </div>

          <div className={styles.divider} />

          {/* TIMING: SWING + HUMANIZE */}
          <div className={styles.timingBlock}>
            <span className={styles.timingBlockLabel}>TIMING</span>
            <div className={styles.timingSliders}>
              <SwingControl value={state.swing} onChange={setSwing} />
              <div className={styles.innerDivider} />
              <HumanizeControl value={humanize} onChange={handleHumanize} />
            </div>
          </div>

          <div className={styles.divider} />

          {/* DUST FILTER */}
          <DustFilterPanel
            lpf={lpf} hpf={hpf}
            onLpfChange={handleLpf}
            onHpfChange={handleHpf}
          />
        </div>

        {/* Sequencer Grid */}
        <div className={`${styles.gridPanel} glass`}>
          <StepGrid
            state={state}
            onStepMouseDown={onStepMouseDown}
            onStepMouseEnter={onStepMouseEnter}
            onToggleMute={toggleMute}
            onVolumeChange={setVolume}
            onClearTrack={clearTrack}
            onPreview={preview}
          />
        </div>

        <footer className={styles.footer}>
          <span>CLICK to toggle · DRAG to paint · SHIFT to stutter · <button className={styles.footerHelp} onClick={() => setShowInfo(true)}>?&nbsp;shortcuts</button></span>
        </footer>
      </div>

      {/* ── Fixed bottom panels — expand upward, never push content ── */}
      <div className={styles.bottomPanels}>
        <BassPanel
          bassState={bassState}
          isArmed={isArmed}
          octave={octave}
          activeKey={activeKey}
          onToggleArm={toggleArm}
          onOctaveDown={octaveDown}
          onOctaveUp={octaveUp}
          onLoadPreset={loadBassPreset}
          onOscType={setOscType}
          onGrit={setGrit}
          onCutoff={setCutoff}
          onResonance={setResonance}
          onVolume={setBassVolume}
          onAttack={setBassAttack}
          onDecay={setBassDecay}
          onSustain={setBassSustain}
          onRelease={setBassRelease}
        />
      </div>

      {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} />}
    </div>
  )
}
