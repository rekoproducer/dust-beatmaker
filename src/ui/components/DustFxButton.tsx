import styles from './DustFxButton.module.css'

interface Props {
  active: boolean
  onChange: (active: boolean) => void
}

export function DustFxButton({ active, onChange }: Props) {
  return (
    <button
      className={`${styles.btn} ${active ? styles.active : ''}`}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      title={active ? 'DUST FX active — BitCrusher + High-Pass Filter' : 'Enable DUST FX'}
    >
      <span className={styles.icon}>{active ? '◈' : '◇'}</span>
      <span className={styles.label}>DUST FX</span>
      {active && <span className={styles.activeDot} />}
    </button>
  )
}
