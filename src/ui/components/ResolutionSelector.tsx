import type { Resolution } from '../../sequencer/types'
import { RESOLUTION_LABELS } from '../../sequencer/types'
import styles from './ResolutionSelector.module.css'

const RESOLUTIONS: Resolution[] = ['4n', '16n', '32n', '64n']

interface Props {
  current: Resolution
  onChange: (r: Resolution) => void
}

export function ResolutionSelector({ current, onChange }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>GRID</span>
      <div className={styles.buttons}>
        {RESOLUTIONS.map((r) => (
          <button
            key={r}
            className={`${styles.btn} ${current === r ? styles.active : ''}`}
            onClick={() => onChange(r)}
            aria-pressed={current === r}
          >
            {RESOLUTION_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  )
}
