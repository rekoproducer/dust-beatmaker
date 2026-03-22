import { useRef, useCallback } from 'react'
import styles from './Knob.module.css'

interface Props {
  value: number       // 0–100
  label: string
  onChange: (v: number) => void
}

const SIZE    = 48
const CX      = SIZE / 2
const CY      = SIZE / 2
const R       = 18
const START_A = -225  // degrees (bottom-left) → 270° sweep to bottom-right

function polarXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function describeArc(startDeg: number, endDeg: number, r: number) {
  const s = polarXY(startDeg, r)
  const e = polarXY(endDeg, r)
  const sweep = endDeg - startDeg
  const large = Math.abs(sweep) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

export function Knob({ value, label, onChange }: Props) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const valueDeg = START_A + (value / 100) * 270

  const pointer = polarXY(valueDeg, R * 0.55)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - ev.clientY) / 80  // px → 0-1
      const next  = Math.max(0, Math.min(100, dragRef.current.startVal + delta * 100))
      onChange(Math.round(next))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange])

  return (
    <div className={styles.wrap}>
      <svg
        width={SIZE} height={SIZE}
        className={styles.svg}
        onMouseDown={onMouseDown}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* Track */}
        <path
          d={describeArc(START_A, START_A + 270, R)}
          fill="none"
          stroke="rgba(255,248,235,0.08)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value > 0 && (
          <path
            d={describeArc(START_A, valueDeg, R)}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}
        {/* Center dot */}
        <circle cx={CX} cy={CY} r="4" fill="var(--pad-bg)" stroke="rgba(255,248,235,0.1)" strokeWidth="1" />
        {/* Pointer */}
        <circle cx={pointer.x} cy={pointer.y} r="2.5" fill="var(--gold)"
          style={{ filter: 'drop-shadow(0 0 3px rgba(197,160,89,0.8))' }} />
      </svg>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}
