// Legacy component — kept for reference, replaced by BankSelector
import styles from './MachineSelector.module.css'

interface Props {
  current: string
  onChange: (m: string) => void
}

const MACHINES: { id: string; label: string; color: string }[] = [
  { id: '707', label: 'TR-707', color: '#A8896A' },
  { id: '808', label: 'TR-808', color: '#C5A059' },
  { id: '909', label: 'TR-909', color: '#E8832A' },
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
