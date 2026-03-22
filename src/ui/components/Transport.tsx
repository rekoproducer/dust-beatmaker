import { useRef } from 'react'
import styles from './Transport.module.css'

interface Props {
  isPlaying: boolean
  bpm: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onClearAll: () => void
}

export function Transport({ isPlaying, bpm, onPlay, onStop, onBpmChange, onClearAll }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={styles.root}>
      {/* Play / Stop */}
      <button
        className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
        onClick={isPlaying ? onStop : onPlay}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? (
          <span className={styles.stopIcon} />
        ) : (
          <span className={styles.playIcon} />
        )}
      </button>

      {/* BPM */}
      <div className={styles.bpmWrap}>
        <span className={styles.bpmLabel}>BPM</span>
        <input
          ref={inputRef}
          type="number"
          className={styles.bpmInput}
          value={bpm}
          min={20}
          max={300}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          onFocus={() => inputRef.current?.select()}
        />
        <div className={styles.bpmNudge}>
          <button onClick={() => onBpmChange(bpm + 1)}>▲</button>
          <button onClick={() => onBpmChange(bpm - 1)}>▼</button>
        </div>
      </div>

      {/* BPM slider */}
      <input
        type="range"
        className={styles.bpmSlider}
        min={20}
        max={300}
        value={bpm}
        onChange={(e) => onBpmChange(Number(e.target.value))}
        aria-label="BPM slider"
      />

      {/* Clear */}
      <button className={styles.clearBtn} onClick={onClearAll}>
        CLEAR
      </button>
    </div>
  )
}
