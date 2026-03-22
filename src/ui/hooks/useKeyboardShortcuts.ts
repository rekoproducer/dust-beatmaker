import { useEffect, useRef } from 'react'
import type { StemBank } from '../../sequencer/types'

interface Handlers {
  isPlaying: boolean
  play: () => void
  stop: () => void
  clearAll: () => void
  switchBank: (bank: StemBank) => void
  startStutter: (sub?: '1/32n' | '1/64n') => void
  stopStutter: () => void
}

const BANK_KEYS: Record<string, StemBank> = {
  '1': 'core-command',
  '2': 'sinter',
  '3': 'dust',
  '4': 'particles',
}

export function useKeyboardShortcuts(handlers: Handlers) {
  const ref = useRef(handlers)
  useEffect(() => { ref.current = handlers }, [handlers])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return

      // ── SHIFT → Stutter (momentary, repeat-proof) ──────────────────────────
      if (e.key === 'Shift' && !e.repeat) {
        e.preventDefault()
        // 1/32n for left shift, 1/64n for right shift (for flexibility)
        const sub = e.code === 'ShiftRight' ? '1/64n' : '1/32n'
        ref.current.startStutter(sub)
        document.body.setAttribute('data-stutter', 'true')
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          ref.current.isPlaying ? ref.current.stop() : ref.current.play()
          break
        case 'c':
        case 'C':
          ref.current.clearAll()
          break
        default:
          if (BANK_KEYS[e.key]) ref.current.switchBank(BANK_KEYS[e.key])
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        ref.current.stopStutter()
        document.body.removeAttribute('data-stutter')
      }
    }

    // visibilitychange: release stutter if user tabs away
    const onBlur = () => {
      ref.current.stopStutter()
      document.body.removeAttribute('data-stutter')
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
