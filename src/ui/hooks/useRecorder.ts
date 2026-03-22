import { useState, useRef, useCallback, useEffect } from 'react'
import { DustRecorder } from '../../engine/recorder'

export interface RecorderControls {
  isRecording: boolean
  elapsed: number        // seconds
  toast: string | null   // feedback message (auto-clears)
  start: () => void
  stop: () => void       // synchronous trigger — awaits internally
}

const TOAST_DURATION_MS = 3000

export function useRecorder(getStream: () => MediaStream | null): RecorderControls {
  const recorderRef = useRef(new DustRecorder())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed]         = useState(0)
  const [toast, setToast]             = useState<string | null>(null)

  const showToast = (msg: string) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }

  useEffect(() => {
    const rec = recorderRef.current
    return () => {
      rec.dispose()
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (toastRef.current)    clearTimeout(toastRef.current)
    }
  }, [])

  const start = useCallback(() => {
    const stream = getStream()

    if (!stream) {
      // Engine not yet initialised — guide the user
      showToast('Press ▶ Play first, then REC')
      return
    }

    recorderRef.current.start(stream)
    setIsRecording(true)
    setElapsed(0)

    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)
  }, [getStream])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Await internally — UI stays responsive
    recorderRef.current.stop().then((filename) => {
      setIsRecording(false)
      setElapsed(0)
      if (filename) showToast(`✓ Session saved — ${filename}`)
    })
  }, [])

  return { isRecording, elapsed, toast, start, stop }
}
