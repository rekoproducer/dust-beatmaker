import { useEffect } from 'react'
import styles from './InfoOverlay.module.css'

interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'SPACE',       desc: 'Play / Pause' },
  { key: 'SHIFT',       desc: 'Live Stutter — hold to glitch' },
  { key: 'SHIFT RIGHT', desc: 'Ultra Glitch (1/64n)' },
  { key: '1 – 4',       desc: 'Switch Stem Bank' },
  { key: 'C',           desc: 'Clear All Steps' },
  { key: 'DRAG',        desc: 'Paint or erase steps across a track' },
  { key: 'RIGHT-CLICK', desc: 'Clear entire track row' },
  { key: 'TRACK LABEL', desc: 'Preview sample' },
]

export function InfoOverlay({ onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>

        <header className={styles.header}>
          <span className={styles.logo}>DUST BEATMAKER</span>
          <span className={styles.sub}>COMMANDS & SHORTCUTS</span>
        </header>

        <table className={styles.table}>
          <tbody>
            {SHORTCUTS.map(({ key, desc }) => (
              <tr key={key}>
                <td className={styles.key}><kbd>{key}</kbd></td>
                <td className={styles.desc}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={styles.footer}>
          <span className={styles.release}>
            Album <strong>DUST</strong> drops <strong>26.05.2026</strong>
          </span>
          <span className={styles.credit}>Made by rekobeats</span>
        </footer>

      </div>
    </div>
  )
}
