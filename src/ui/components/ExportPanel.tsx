import { useState } from 'react'
import { renderLoop, downloadBlob } from '../../export/offlineRenderer'
import { encodeWav } from '../../export/wavEncoder'
import { encodeMp3 } from '../../export/mp3Encoder'
import type { SequencerState } from '../../sequencer/types'
import styles from './ExportPanel.module.css'

interface Props {
  state: SequencerState
  dustFxActive?: boolean
}

type ExportStatus = 'idle' | 'rendering' | 'encoding' | 'done' | 'error'

export function ExportPanel({ state, dustFxActive = false }: Props) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState('')

  const hasActiveSteps = state.tracks.some((t) =>
    !t.muted && t.steps.some((s) => s.active)
  )

  async function handleExport(format: 'wav' | 'mp3') {
    if (!hasActiveSteps) return
    setStatus('rendering')
    setProgress('Rendering audio…')

    try {
      const audioBuffer = await renderLoop(state, { dustFx: dustFxActive })

      setStatus('encoding')
      setProgress(`Encoding ${format.toUpperCase()}…`)
      await new Promise((r) => setTimeout(r, 10))

      const blob =
        format === 'wav'
          ? encodeWav(audioBuffer)
          : encodeMp3(audioBuffer, 192)

      const loopDuration = ((60 / state.bpm) * state.stepCount) / 4
      const fxTag   = dustFxActive ? '-dustfx' : ''
      const filename = `beatmaker-${state.bank}-${state.bpm}bpm${fxTag}-${loopDuration.toFixed(1)}s.${format}`
      downloadBlob(blob, filename)

      setStatus('done')
      setProgress(`${format.toUpperCase()} saved!`)
      setTimeout(() => { setStatus('idle'); setProgress('') }, 2500)
    } catch (err) {
      console.error('Export failed:', err)
      setStatus('error')
      setProgress('Export failed')
      setTimeout(() => { setStatus('idle'); setProgress('') }, 3000)
    }
  }

  const busy = status === 'rendering' || status === 'encoding'

  return (
    <div className={styles.root}>
      <span className={styles.label}>
        EXPORT{dustFxActive ? <span className={styles.fxTag}> +FX</span> : null}
      </span>

      <div className={styles.buttons}>
        <button
          className={`${styles.btn} ${styles.wav}`}
          onClick={() => handleExport('wav')}
          disabled={busy || !hasActiveSteps}
          title="Export as WAV (lossless)"
        >
          {busy ? <Spinner /> : 'WAV'}
        </button>

        <button
          className={`${styles.btn} ${styles.mp3}`}
          onClick={() => handleExport('mp3')}
          disabled={busy || !hasActiveSteps}
          title="Export as MP3 192kbps"
        >
          {busy ? <Spinner /> : 'MP3'}
        </button>
      </div>

      {progress && (
        <span className={`${styles.progress} ${status === 'done' ? styles.done : ''} ${status === 'error' ? styles.errStatus : ''}`}>
          {progress}
        </span>
      )}
    </div>
  )
}

function Spinner() {
  return <span className={styles.spinner} />
}
