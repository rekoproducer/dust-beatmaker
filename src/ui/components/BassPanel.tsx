import { useState, useRef, useCallback } from 'react'
import { BASS_PRESETS, KEY_LAYOUT, WHITE_KEYS, buildNoteMap, type BassPreset, type OscType } from '../../engine/bassEngine'
import type { BassState } from '../hooks/useBass'
import styles from './BassPanel.module.css'

// ── SVG Rotary Knob ───────────────────────────────────────────────────────────

const KS = 52   // knob SVG size
const KCX = KS / 2
const KCY = KS / 2
const KR  = 19
const K_START = -225  // degrees

function kPolarXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: KCX + r * Math.cos(rad), y: KCY + r * Math.sin(rad) }
}

function kDescribeArc(startDeg: number, endDeg: number, r: number) {
  const s = kPolarXY(startDeg, r)
  const e = kPolarXY(endDeg, r)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}

function BassKnob({ label, value, min, max, step, display, onChange }: KnobProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const pct = (value - min) / (max - min)
  const valueDeg = K_START + pct * 270
  const pointer = kPolarXY(valueDeg, KR * 0.56)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - ev.clientY) / 100
      const raw   = dragRef.current.startVal + delta * (max - min)
      const snapped = Math.round(raw / step) * step
      onChange(Math.max(min, Math.min(max, snapped)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, min, max, step, onChange])

  return (
    <div className={styles.knobWrap}>
      <span className={styles.knobLabel}>{label}</span>
      <svg
        width={KS} height={KS}
        className={styles.knobSvg}
        onMouseDown={onMouseDown}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        style={{ cursor: 'ns-resize' }}
      >
        {/* Track */}
        <path
          d={kDescribeArc(K_START, K_START + 270, KR)}
          fill="none"
          stroke="rgba(255,248,235,0.08)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={kDescribeArc(K_START, valueDeg, KR)}
            fill="none"
            stroke="var(--amber)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}
        {/* Center */}
        <circle cx={KCX} cy={KCY} r="4.5" fill="var(--pad-bg)" stroke="rgba(255,248,235,0.1)" strokeWidth="1" />
        {/* Pointer dot */}
        <circle
          cx={pointer.x} cy={pointer.y} r="2.5"
          fill="var(--amber)"
          style={{ filter: 'drop-shadow(0 0 3px rgba(232,131,42,0.8))' }}
        />
      </svg>
      <span className={styles.knobValue}>{display}</span>
    </div>
  )
}

// ── Mini keyboard display ─────────────────────────────────────────────────────

interface KeyboardProps {
  octave: number
  activeKey: string | null
  onOctaveDown: () => void
  onOctaveUp: () => void
}

function MiniKeyboard({ octave, activeKey, onOctaveDown, onOctaveUp }: KeyboardProps) {
  const noteMap = buildNoteMap(octave)

  return (
    <div className={styles.keyboardWrap}>
      {/* Octave indicator */}
      <div className={styles.keyboardOctave}>
        <span className={styles.octaveLabel}>OCT</span>
        <span className={styles.octaveValue}>{octave}</span>
        <button className={styles.octaveBtn} onClick={onOctaveDown} title="Octave down (Z)">▼</button>
        <button className={styles.octaveBtn} onClick={onOctaveUp}   title="Octave up (X)">▲</button>
      </div>

      {/* Black keys row */}
      <div className={styles.blackKeysRow}>
        {KEY_LAYOUT.map((slot, i) =>
          slot.hasSpacer ? (
            <div key={i} className={styles.blackKeySpacer} />
          ) : (
            <div
              key={slot.key}
              className={`${styles.blackKey} ${activeKey === slot.key ? styles.keyActive : ''}`}
              title={`${slot.note}${octave} — press ${slot.label}`}
            >
              {slot.label}
            </div>
          )
        )}
      </div>

      {/* White keys row */}
      <div className={styles.whiteKeysRow}>
        {WHITE_KEYS.map(({ key, label, note }, i) => {
          const fullNote = noteMap[key]
          return (
            <div
              key={key}
              className={`${styles.whiteKey} ${activeKey === key ? styles.keyActive : ''}`}
              title={`${fullNote} — press ${label}`}
            >
              <span>{label}</span>
              <span className={styles.keyNote}>{note}{i === 7 ? octave + 1 : octave}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── BassPanel ─────────────────────────────────────────────────────────────────

interface Props {
  bassState: BassState
  isArmed: boolean
  octave: number
  activeKey: string | null
  onToggleArm: () => void
  onOctaveDown: () => void
  onOctaveUp: () => void
  onLoadPreset: (p: BassPreset) => void
  onOscType: (t: OscType) => void
  onGrit: (v: number) => void
  onCutoff: (v: number) => void
  onResonance: (v: number) => void
  onVolume: (v: number) => void
  onAttack: (v: number) => void
  onDecay: (v: number) => void
  onSustain: (v: number) => void
  onRelease: (v: number) => void
}

const OSC_TYPES: { type: OscType; label: string }[] = [
  { type: 'square',   label: 'SQUARE'   },
  { type: 'sine',     label: 'SINE'     },
  { type: 'sawtooth', label: 'SAW'      },
]

export function BassPanel({
  bassState, isArmed, octave, activeKey,
  onToggleArm, onOctaveDown, onOctaveUp,
  onLoadPreset, onOscType,
  onGrit, onCutoff, onResonance, onVolume,
  onAttack, onDecay, onSustain, onRelease,
}: Props) {
  const [open, setOpen] = useState(false)

  const activePreset = BASS_PRESETS.find(p => p.id === bassState.presetId)
  const noteMap = buildNoteMap(octave)
  const activeNote = activeKey ? noteMap[activeKey] : null

  return (
    <div className={styles.wrapper}>
      {/* ── Toggle bar ── */}
      <div
        className={`${styles.toggleBar} ${isArmed ? styles.armed : ''} ${open ? styles.open : ''}`}
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
      >
        {isArmed && <span className={styles.armDot} />}
        <span className={styles.toggleLabel}>BASS PUNISHER</span>

        {activeNote && (
          <span className={styles.activeNoteBadge}>{activeNote}</span>
        )}

        {activePreset && !activeNote && (
          <span className={styles.presetBadge}>{activePreset.name}</span>
        )}

        <span className={styles.toggleSpacer} />
        <span className={styles.toggleHint}>{open ? 'CLICK TO CLOSE' : 'CLICK TO EXPAND'}</span>
        <button
          className={`${styles.chevron} ${open ? styles.rotated : ''}`}
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          aria-label={open ? 'Close bass panel' : 'Open bass panel'}
        >▼</button>
      </div>

      {/* ── Expanded panel ── */}
      {open && (
        <div className={`${styles.panel} glass`}>

          {/* Row 1: OSC type */}
          <div className={styles.oscRow}>
            <span className={styles.rowLabel}>OSC</span>
            <div className={styles.oscButtons}>
              {OSC_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  className={`${styles.oscBtn} ${bassState.oscType === type ? styles.oscActive : ''}`}
                  onClick={() => onOscType(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.hDivider} />

          {/* Row 2: Main controls — 4 knobs */}
          <div className={styles.knobsRow}>
            <BassKnob
              label="THUMP"
              value={bassState.volume}
              min={-20} max={0} step={0.5}
              display={`${bassState.volume.toFixed(1)} dB`}
              onChange={onVolume}
            />
            <BassKnob
              label="GRIT"
              value={bassState.grit}
              min={0} max={100} step={1}
              display={`${Math.round(bassState.grit)}%`}
              onChange={onGrit}
            />
            <BassKnob
              label="CUTOFF"
              value={bassState.cutoff}
              min={40} max={2000} step={5}
              display={`${Math.round(bassState.cutoff)} Hz`}
              onChange={onCutoff}
            />
            <BassKnob
              label="RES"
              value={bassState.resonance}
              min={0} max={20} step={0.1}
              display={`Q ${bassState.resonance.toFixed(1)}`}
              onChange={onResonance}
            />
          </div>

          <div className={styles.hDivider} />

          {/* Row 3: ADSR — 4 knobs */}
          <div className={styles.knobsRow}>
            <BassKnob
              label="ATK"
              value={bassState.attack}
              min={0.001} max={2} step={0.001}
              display={bassState.attack < 0.1 ? `${(bassState.attack * 1000).toFixed(0)}ms` : `${bassState.attack.toFixed(2)}s`}
              onChange={onAttack}
            />
            <BassKnob
              label="DCY"
              value={bassState.decay}
              min={0.01} max={2} step={0.01}
              display={`${bassState.decay.toFixed(2)}s`}
              onChange={onDecay}
            />
            <BassKnob
              label="SUS"
              value={bassState.sustain}
              min={0} max={1} step={0.01}
              display={bassState.sustain.toFixed(2)}
              onChange={onSustain}
            />
            <BassKnob
              label="REL"
              value={bassState.release}
              min={0.01} max={4} step={0.01}
              display={`${bassState.release.toFixed(2)}s`}
              onChange={onRelease}
            />
          </div>

          <div className={styles.hDivider} />

          {/* Row 4: Keyboard + ARM + Presets */}
          <div className={styles.bottomRow}>

            {/* Mini keyboard */}
            <MiniKeyboard
              octave={octave}
              activeKey={activeKey}
              onOctaveDown={onOctaveDown}
              onOctaveUp={onOctaveUp}
            />

            {/* ARM button */}
            <div className={styles.armSection}>
              <button
                className={`${styles.armBtn} ${isArmed ? styles.armActive : ''}`}
                onClick={e => { e.stopPropagation(); onToggleArm() }}
              >
                {isArmed ? '⬤ ARMED' : '○ ARM KEYS'}
              </button>
              <span className={styles.armHint}>{isArmed ? 'A–K · W E T Y U' : 'CLICK TO ACTIVATE'}</span>
            </div>

            {/* Presets */}
            <div className={styles.presets}>
              <span className={styles.presetsLabel}>PRESETS</span>
              <div className={styles.presetsList}>
                {BASS_PRESETS.map((p, i) => (
                  <button
                    key={p.id}
                    className={`${styles.presetBtn} ${bassState.presetId === p.id ? styles.presetActive : ''}`}
                    onClick={() => onLoadPreset(p)}
                  >
                    <span className={styles.presetNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.presetName}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
