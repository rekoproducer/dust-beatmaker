import { useEffect, useRef, useCallback } from 'react'
import type { TrackId } from '../../sequencer/types'

interface PaintState {
  active: boolean   // currently dragging?
  paintValue: boolean  // are we painting ON or OFF?
  trackId: TrackId     // only paint within the same track
}

/**
 * Drag-to-paint for the step sequencer grid.
 *
 * Usage:
 *   const { onStepMouseDown, onStepMouseEnter } = usePaintMode(toggleStep, getStepActive)
 *
 * - mousedown on a step:  records the first step's current state (inverted = paint target)
 * - mouseenter on a step: if painting on the same track, sets step to paintValue
 * - mouseup anywhere:     stops painting
 */
export function usePaintMode(
  toggleStep: (trackId: TrackId, stepIndex: number) => void,
  getStepActive: (trackId: TrackId, stepIndex: number) => boolean
) {
  const paint = useRef<PaintState | null>(null)

  // Stop painting on mouseup anywhere on the page
  useEffect(() => {
    const stop = () => { paint.current = null }
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  const onStepMouseDown = useCallback((trackId: TrackId, stepIndex: number) => {
    const currentlyActive = getStepActive(trackId, stepIndex)
    paint.current = {
      active: true,
      paintValue: !currentlyActive,  // first click determines paint direction
      trackId,
    }
    toggleStep(trackId, stepIndex)
  }, [toggleStep, getStepActive])

  const onStepMouseEnter = useCallback((trackId: TrackId, stepIndex: number) => {
    const p = paint.current
    if (!p?.active || p.trackId !== trackId) return
    const currentlyActive = getStepActive(trackId, stepIndex)
    // Only change steps that aren't already in the target state
    if (currentlyActive !== p.paintValue) {
      toggleStep(trackId, stepIndex)
    }
  }, [toggleStep, getStepActive])

  return { onStepMouseDown, onStepMouseEnter }
}
