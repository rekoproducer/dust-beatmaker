import styles from './SliderControl.module.css'

interface Props {
  value: number
  onChange: (v: number) => void
}

export function HumanizeControl({ value, onChange }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>HUMANIZE</span>
        <span className={`${styles.value} ${styles.amber}`}>{value.toFixed(0)}%</span>
      </div>
      <input
        type="range"
        className={`${styles.slider} ${styles.amber}`}
        min={0} max={100} step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Humanize timing jitter"
        style={{ '--pct': `${value}%` } as React.CSSProperties}
      />
      <div className={styles.ticks}>
        {[0, 25, 50, 75, 100].map((t) => <span key={t} className={styles.tick} />)}
      </div>
    </div>
  )
}
