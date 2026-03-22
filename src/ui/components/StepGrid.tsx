import { TrackRow } from './TrackRow'
import type { SequencerState, TrackId } from '../../sequencer/types'
import { RESOLUTION_STEP_SIZE } from '../../sequencer/types'
import styles from './StepGrid.module.css'

interface Props {
  state: SequencerState
  onStepMouseDown: (trackId: TrackId, stepIndex: number) => void
  onStepMouseEnter: (trackId: TrackId, stepIndex: number) => void
  onToggleMute: (trackId: TrackId) => void
  onVolumeChange: (trackId: TrackId, vol: number) => void
  onClearTrack: (trackId: TrackId) => void
  onPreview: (trackId: TrackId) => void
}

function buildRuler(stepCount: number): string[] {
  return Array.from({ length: stepCount }, (_, i) =>
    i % 4 === 0 ? String(Math.floor(i / 4) + 1) : ''
  )
}

export function StepGrid({
  state, onStepMouseDown, onStepMouseEnter,
  onToggleMute, onVolumeChange, onClearTrack, onPreview,
}: Props) {
  const stepSize = RESOLUTION_STEP_SIZE[state.resolution]
  const ruler    = buildRuler(state.stepCount)

  return (
    <div className={styles.root}>
      <div className={styles.scrollWrap}>
        {/* Beat ruler */}
        <div className={styles.ruler}>
          <div className={styles.rulerOffset} />
          <div className={styles.rulerSteps}>
            {ruler.map((marker, i) => (
              <div
                key={i}
                className={[
                  styles.rulerCell,
                  i > 0 && i % 4 === 0 ? styles.groupStart : '',
                  state.isPlaying && i === state.currentStep ? styles.rulerActive : '',
                ].join(' ')}
                style={{ width: stepSize }}
              >
                {marker}
              </div>
            ))}
          </div>
        </div>

        {state.tracks.length === 0 && (
          <div className={styles.emptyState}>
            {state.isLoading ? 'Scanning stems…' : 'No WAV files found in this bank.'}
          </div>
        )}

        <div className={styles.tracks}>
          {state.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              currentStep={state.currentStep}
              isPlaying={state.isPlaying}
              stepSize={stepSize}
              onStepMouseDown={onStepMouseDown}
              onStepMouseEnter={onStepMouseEnter}
              onToggleMute={onToggleMute}
              onVolumeChange={onVolumeChange}
              onClearTrack={onClearTrack}
              onPreview={onPreview}
              style={{ animationDelay: `${idx * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
