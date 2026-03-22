import styles from './RecordButton.module.css'

interface Props {
  isRecording: boolean
  elapsed: number       // seconds
  toast: string | null  // feedback message
  onStart: () => void
  onStop: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordButton({ isRecording, elapsed, toast, onStart, onStop }: Props) {
  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${isRecording ? styles.recording : ''}`}
        onClick={isRecording ? onStop : onStart}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        title={isRecording ? 'Stop & download session' : 'Record live session — WYSIWYG'}
      >
        <span className={styles.dot} />
        <span className={styles.label}>
          {isRecording ? `STOP  ${formatTime(elapsed)}` : 'REC'}
        </span>
      </button>

      {toast && (
        <span
          className={`${styles.toast} ${toast.startsWith('✓') ? styles.toastOk : styles.toastWarn}`}
        >
          {toast}
        </span>
      )}
    </div>
  )
}
