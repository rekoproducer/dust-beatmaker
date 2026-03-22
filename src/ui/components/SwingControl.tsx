import styles from './SliderControl.module.css'

interface Props {
  value: number
  onChange: (v: number) => void
}

export function SwingControl({ value, onChange }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>SWING</span>
        <span className={`${styles.value} ${styles.sand}`}>{value.toFixed(0)}%</span>
      </div>
      <input
        type="range"
        className={`${styles.slider} ${styles.sand}`}
        min={0} max={100} step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Swing amount"
        style={{ '--pct': `${value}%` } as React.CSSProperties}
      />
      <div className={styles.ticks}>
        {[0, 25, 50, 75, 100].map((t) => <span key={t} className={styles.tick} />)}
      </div>
    </div>
  )
}
