import type { DrumMachine } from '../../sequencer/types'
import styles from './MachineSelector.module.css'

interface Props {
  current: DrumMachine
  onChange: (m: DrumMachine) => void
}

const MACHINES: { id: DrumMachine; label: string; color: string }[] = [
  { id: '707', label: 'TR-707', color: '#A8896A' },  // warm sand
  { id: '808', label: 'TR-808', color: '#C5A059' },  // dusty gold
  { id: '909', label: 'TR-909', color: '#E8832A' },  // deep amber
]

export function MachineSelector({ current, onChange }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>MACHINE</span>
      <div className={styles.buttons}>
        {MACHINES.map(({ id, label, color }) => (
          <button
            key={id}
            className={`${styles.btn} ${current === id ? styles.active : ''}`}
            style={{ '--accent': color } as React.CSSProperties}
            onClick={() => onChange(id)}
            aria-pressed={current === id}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
