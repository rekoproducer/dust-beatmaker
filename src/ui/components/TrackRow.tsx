import { StepButton } from './StepButton'
import type { Track, TrackId } from '../../sequencer/types'
import styles from './TrackRow.module.css'

interface Props {
  track: Track
  currentStep: number
  isPlaying: boolean
  stepSize: number
  onStepMouseDown: (trackId: TrackId, stepIndex: number) => void
  onStepMouseEnter: (trackId: TrackId, stepIndex: number) => void
  onToggleMute: (trackId: TrackId) => void
  onVolumeChange: (trackId: TrackId, vol: number) => void
  onClearTrack: (trackId: TrackId) => void
  onPreview: (trackId: TrackId) => void
  style?: React.CSSProperties
}

export function TrackRow({
  track, currentStep, isPlaying, stepSize,
  onStepMouseDown, onStepMouseEnter,
  onToggleMute, onVolumeChange, onClearTrack, onPreview,
  style,
}: Props) {
  const activeCount = track.steps.filter((s) => s.active).length

  return (
    <div
      className={`${styles.row} ${track.muted ? styles.muted : ''}`}
      style={style}
      // Prevent browser drag behaviour that would break paint mode
      onDragStart={(e) => e.preventDefault()}
    >
      <div className={styles.meta}>
        <button
          className={styles.label}
          onClick={() => onPreview(track.id)}
          title={`Preview ${track.label}`}
        >
          {track.label}
        </button>

        <div className={styles.controls}>
          <button
            className={`${styles.muteBtn} ${track.muted ? styles.mutedActive : ''}`}
            onClick={() => onToggleMute(track.id)}
            aria-label={track.muted ? 'Unmute' : 'Mute'}
          >
            M
          </button>
          <input
            type="range"
            className={styles.volSlider}
            min={0} max={1} step={0.01}
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, Number(e.target.value))}
            aria-label={`${track.label} volume`}
          />
        </div>

        <span className={styles.count}>
          {activeCount > 0 ? `${activeCount}/${track.steps.length}` : '—'}
        </span>
      </div>

      <div className={styles.steps}>
        {track.steps.map((step, i) => (
          <StepButton
            key={i}
            active={step.active}
            isCurrent={isPlaying && i === currentStep}
            velocity={step.velocity}
            groupStart={i > 0 && i % 4 === 0}
            size={stepSize}
            onMouseDown={() => onStepMouseDown(track.id, i)}
            onMouseEnter={() => onStepMouseEnter(track.id, i)}
            onContextMenu={(e) => { e.preventDefault(); onClearTrack(track.id) }}
          />
        ))}
      </div>
    </div>
  )
}
