import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BassEngine, BASS_PRESETS, buildNoteMap,
  type BassPreset, type OscType,
} from '../../engine/bassEngine'

export interface BassState {
  presetId: string
  oscType: OscType
  grit: number
  cutoff: number
  resonance: number
  volume: number
  attack: number
  decay: number
  sustain: number
  release: number
}

const DEFAULT_PRESET = BASS_PRESETS[0] // DEEP RUST

function stateFromPreset(p: BassPreset): BassState {
  return {
    presetId:  p.id,
    oscType:   p.oscType,
    grit:      p.grit,
    cutoff:    p.cutoff,
    resonance: p.resonance,
    volume:    p.volume,
    attack:    p.attack,
    decay:     p.decay,
    sustain:   p.sustain,
    release:   p.release,
  }
}

export function useBass() {
  const engineRef = useRef<BassEngine | null>(null)

  const [bassState, setBassState] = useState<BassState>(() => stateFromPreset(DEFAULT_PRESET))
  const [isArmed,   setIsArmed]   = useState(false)
  const [octave,    setOctave]    = useState(2)          // default: C2
  const [activeKey, setActiveKey] = useState<string | null>(null)

  // Mutable refs for the keyboard handler closure — no re-subscription needed
  const isArmedRef  = useRef(false)
  const octaveRef   = useRef(2)
  const activeKeyRef = useRef<string | null>(null)

  useEffect(() => { isArmedRef.current  = isArmed }, [isArmed])
  useEffect(() => { octaveRef.current   = octave  }, [octave])

  // ── Engine lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    const engine = new BassEngine()
    engine.loadPreset(DEFAULT_PRESET)
    engineRef.current = engine
    return () => engine.dispose()
  }, [])

  // ── Keyboard handler ───────────────────────────────────────────────────────
  // Only fires when isArmed. Z = octave down, X = octave up.
  // Key layout: a s d f g h j k  (white), w e t y u (black).
  // No overlap with existing shortcuts (Space / 1–4 / C / Shift).

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if (!isArmedRef.current) return
      if (e.repeat) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = e.key.toLowerCase()

      // Octave shift
      if (key === 'z') { setOctave(o => Math.max(0, o - 1)); return }
      if (key === 'x') { setOctave(o => Math.min(5, o + 1)); return }

      const note = buildNoteMap(octaveRef.current)[key]
      if (!note) return

      e.preventDefault()                  // stop key from triggering browser actions
      activeKeyRef.current = key
      setActiveKey(key)
      await engineRef.current?.noteOn(note)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isArmedRef.current) return
      const key = e.key.toLowerCase()
      if (key !== activeKeyRef.current) return   // different key — ignore
      activeKeyRef.current = null
      setActiveKey(null)
      engineRef.current?.noteOff()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
    }
  }, []) // intentionally empty — refs keep values fresh

  // ── ARM toggle ─────────────────────────────────────────────────────────────

  const toggleArm = useCallback(() => {
    setIsArmed(prev => {
      if (prev) {
        // Disarming → release any held note
        engineRef.current?.noteOff()
        activeKeyRef.current = null
        setActiveKey(null)
      }
      return !prev
    })
  }, [])

  // ── Controls ──────────────────────────────────────────────────────────────

  const loadPreset = useCallback((p: BassPreset) => {
    engineRef.current?.loadPreset(p)
    setBassState(stateFromPreset(p))
  }, [])

  const setOscType = useCallback((type: OscType) => {
    engineRef.current?.setOscType(type)
    setBassState(s => ({ ...s, oscType: type, presetId: '' }))
  }, [])

  const setGrit = useCallback((v: number) => {
    engineRef.current?.setGrit(v)
    setBassState(s => ({ ...s, grit: v, presetId: '' }))
  }, [])

  const setCutoff = useCallback((v: number) => {
    engineRef.current?.setCutoff(v)
    setBassState(s => ({ ...s, cutoff: v, presetId: '' }))
  }, [])

  const setResonance = useCallback((v: number) => {
    engineRef.current?.setResonance(v)
    setBassState(s => ({ ...s, resonance: v, presetId: '' }))
  }, [])

  const setVolume = useCallback((v: number) => {
    engineRef.current?.setVolume(v)
    setBassState(s => ({ ...s, volume: v, presetId: '' }))
  }, [])

  const setAttack  = useCallback((v: number) => { engineRef.current?.setAttack(v);  setBassState(s => ({ ...s, attack:  v, presetId: '' })) }, [])
  const setDecay   = useCallback((v: number) => { engineRef.current?.setDecay(v);   setBassState(s => ({ ...s, decay:   v, presetId: '' })) }, [])
  const setSustain = useCallback((v: number) => { engineRef.current?.setSustain(v); setBassState(s => ({ ...s, sustain: v, presetId: '' })) }, [])
  const setRelease = useCallback((v: number) => { engineRef.current?.setRelease(v); setBassState(s => ({ ...s, release: v, presetId: '' })) }, [])

  const octaveDown = useCallback(() => setOctave(o => Math.max(0, o - 1)), [])
  const octaveUp   = useCallback(() => setOctave(o => Math.min(5, o + 1)), [])

  /** Called once after AudioEngine is ready — routes bass into recorder tap. */
  const rerouteOutput = useCallback((connectFn: (node: import('tone').ToneAudioNode) => void) => {
    engineRef.current?.rerouteOutput(connectFn)
  }, [])

  return {
    bassState,
    isArmed,
    octave,
    activeKey,
    toggleArm,
    octaveDown,
    octaveUp,
    rerouteOutput,
    loadPreset,
    setOscType,
    setGrit,
    setCutoff,
    setResonance,
    setVolume,
    setAttack,
    setDecay,
    setSustain,
    setRelease,
  }
}
