import type { StemBank } from '../../sequencer/types'
import { STEM_BANKS } from '../../sequencer/types'
import styles from './BankSelector.module.css'

interface Props {
  current: StemBank
  isLoading: boolean
  onChange: (bank: StemBank) => void
}

export function BankSelector({ current, isLoading, onChange }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>
        {isLoading ? <span className={styles.spinner} /> : null}
        STEM BANK
      </span>
      <div className={styles.buttons}>
        {STEM_BANKS.map(({ id, label, color }) => (
          <button
            key={id}
            className={`${styles.btn} ${current === id ? styles.active : ''}`}
            style={{ '--accent': color } as React.CSSProperties}
            onClick={() => !isLoading && onChange(id)}
            aria-pressed={current === id}
            disabled={isLoading}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
