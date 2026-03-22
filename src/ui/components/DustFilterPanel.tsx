import { Knob } from './Knob'
import styles from './DustFilterPanel.module.css'

interface Props {
  lpf: number   // 0–100 (0=dark, 100=bright/open)
  hpf: number   // 0–100 (0=full bass, 100=cut bass)
  onLpfChange: (v: number) => void
  onHpfChange: (v: number) => void
}

export function DustFilterPanel({ lpf, hpf, onLpfChange, onHpfChange }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.title}>DUST FILTER</span>
      <div className={styles.knobs}>
        <Knob value={lpf} label="LPF" onChange={onLpfChange} />
        <Knob value={hpf} label="HPF" onChange={onHpfChange} />
      </div>
    </div>
  )
}
