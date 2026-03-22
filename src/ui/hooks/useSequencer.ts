import { useCallback, useEffect, useReducer, useRef } from 'react'
import { AudioEngine } from '../../engine/audioEngine'
import {
  createInitialState, toggleStep, setStepVelocity, setBpm,
  toggleMute, setTrackVolume, clearTrack, clearAll,
  setBank, setBankLoaded, setResolution, setSwing, setTracks,
} from '../../sequencer/sequencer'
import type { StemBank, Resolution, SequencerState, TrackId } from '../../sequencer/types'
import { discoverBankFiles, bankFolder } from '../../engine/stemLoader'

type Action =
  | { type: 'TOGGLE_STEP';         trackId: TrackId; stepIndex: number }
  | { type: 'SET_VELOCITY';        trackId: TrackId; stepIndex: number; velocity: number }
  | { type: 'SET_BPM';             bpm: number }
  | { type: 'TOGGLE_MUTE';         trackId: TrackId }
  | { type: 'SET_VOLUME';          trackId: TrackId; volume: number }
  | { type: 'CLEAR_TRACK';         trackId: TrackId }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_BANK';            bank: StemBank }
  | { type: 'SET_BANK_LOADED' }
  | { type: 'SET_TRACKS';          trackIds: TrackId[] }
  | { type: 'SET_RESOLUTION';      resolution: Resolution }
  | { type: 'SET_SWING';           swing: number }
  | { type: 'SET_PLAYING';         isPlaying: boolean }
  | { type: 'SET_CURRENT_STEP';    stepIndex: number }

function reducer(state: SequencerState, action: Action): SequencerState {
  switch (action.type) {
    case 'TOGGLE_STEP':      return toggleStep(state, action.trackId, action.stepIndex)
    case 'SET_VELOCITY':     return setStepVelocity(state, action.trackId, action.stepIndex, action.velocity)
    case 'SET_BPM':          return setBpm(state, action.bpm)
    case 'TOGGLE_MUTE':      return toggleMute(state, action.trackId)
    case 'SET_VOLUME':       return setTrackVolume(state, action.trackId, action.volume)
    case 'CLEAR_TRACK':      return clearTrack(state, action.trackId)
    case 'CLEAR_ALL':        return clearAll(state)
    case 'SET_BANK':         return setBank(state, action.bank)
    case 'SET_BANK_LOADED':  return setBankLoaded(state)
    case 'SET_TRACKS':       return setTracks(state, action.trackIds)
    case 'SET_RESOLUTION':   return setResolution(state, action.resolution)
    case 'SET_SWING':        return setSwing(state, action.swing)
    case 'SET_PLAYING':      return { ...state, isPlaying: action.isPlaying }
    case 'SET_CURRENT_STEP': return { ...state, currentStep: action.stepIndex }
    default:                 return state
  }
}

export function useSequencer(initialBank: StemBank = 'core-command') {
  const [state, dispatch] = useReducer(reducer, createInitialState(initialBank))
  const engineRef = useRef<AudioEngine | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    engineRef.current?.updateState(state)
  }, [state])

  useEffect(() => () => { engineRef.current?.dispose() }, [])

  // ── Auto-scan on mount: discover tracks immediately without pressing Play ──
  useEffect(() => {
    async function scanOnMount() {
      const folder = bankFolder(initialBank)
      const files = await discoverBankFiles(folder)
      const trackIds = files.map((f) => f.replace(/\.wav$/i, ''))
      dispatch({ type: 'SET_TRACKS', trackIds })
      dispatch({ type: 'SET_BANK_LOADED' })
    }
    scanOnMount()
  }, [initialBank]) // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(async () => {
    // Reuse existing engine if available — avoids disposing samplers + re-loading
    // which was the root cause of the grid being wiped on every Play press.
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(
        stateRef.current,
        (stepIndex) => dispatch({ type: 'SET_CURRENT_STEP', stepIndex }),
        (trackIds) => dispatch({ type: 'SET_TRACKS', trackIds }),
        () => dispatch({ type: 'SET_BANK_LOADED' })
      )
    } else {
      // Update state ref so engine uses current BPM/swing/resolution
      engineRef.current.updateState(stateRef.current)
    }

    await engineRef.current.start()
    dispatch({ type: 'SET_PLAYING', isPlaying: true })
  }, [])

  const stop = useCallback(() => {
    // Stop transport only — do NOT dispose engine or samplers.
    // Disposing would force a full reload on next Play, wiping the grid.
    engineRef.current?.stop()
    dispatch({ type: 'SET_PLAYING', isPlaying: false })
  }, [])

  const switchBank = useCallback(async (bank: StemBank) => {
    dispatch({ type: 'SET_BANK', bank })

    // Re-scan the new bank folder immediately (shows tracks before Play)
    const folder = bankFolder(bank)
    const files = await discoverBankFiles(folder)
    const trackIds = files.map((f) => f.replace(/\.wav$/i, ''))
    dispatch({ type: 'SET_TRACKS', trackIds })
    dispatch({ type: 'SET_BANK_LOADED' })

    // If already playing, reload the engine with new bank
    if (engineRef.current) {
      await engineRef.current.switchBank(bank)
    }
  }, [])

  const setFxActive         = useCallback((active: boolean) => engineRef.current?.setFxActive(active), [])
  const setHumanize         = useCallback((v: number) => engineRef.current?.setHumanize(v), [])
  const setLpf              = useCallback((v: number) => engineRef.current?.setLpf(v), [])
  const setHpf              = useCallback((v: number) => engineRef.current?.setHpf(v), [])
  const startStutter        = useCallback((sub?: '1/32n' | '1/64n') => engineRef.current?.startStutter(sub), [])
  const stopStutter         = useCallback(() => engineRef.current?.stopStutter(), [])
  const getRecordingStream  = useCallback((): MediaStream | null =>
    engineRef.current?.getRecordingStream() ?? null, [])

  // Master volume: 0–100 → 0dB (100) to -40dB (0), muted below 2
  const setMasterVolume = useCallback((pct: number) => {
    if (!engineRef.current) return
    if (pct <= 0) {
      engineRef.current.setMasterVolume(-Infinity)
    } else {
      const db = (pct / 100) * 40 - 40  // 0%→-40dB, 100%→0dB
      engineRef.current.setMasterVolume(db)
    }
  }, [])

  return {
    state,
    play,
    stop,
    switchBank,
    setFxActive,
    setMasterVolume,
    setHumanize,
    setLpf,
    setHpf,
    startStutter,
    stopStutter,
    getRecordingStream,
    toggleStep:       useCallback((id: TrackId, i: number) => dispatch({ type: 'TOGGLE_STEP', trackId: id, stepIndex: i }), []),
    setVelocity:      useCallback((id: TrackId, i: number, v: number) => dispatch({ type: 'SET_VELOCITY', trackId: id, stepIndex: i, velocity: v }), []),
    setBpm:           useCallback((bpm: number) => dispatch({ type: 'SET_BPM', bpm }), []),
    toggleMute:       useCallback((id: TrackId) => dispatch({ type: 'TOGGLE_MUTE', trackId: id }), []),
    setVolume:        useCallback((id: TrackId, v: number) => dispatch({ type: 'SET_VOLUME', trackId: id, volume: v }), []),
    clearTrack:       useCallback((id: TrackId) => dispatch({ type: 'CLEAR_TRACK', trackId: id }), []),
    clearAll:         useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []),
    switchResolution: useCallback((r: Resolution) => dispatch({ type: 'SET_RESOLUTION', resolution: r }), []),
    setSwing:         useCallback((s: number) => dispatch({ type: 'SET_SWING', swing: s }), []),
    preview:          useCallback((id: TrackId) => engineRef.current?.triggerPreview(id), []),
  }
}
