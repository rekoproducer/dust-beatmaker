import styles from './StepButton.module.css'

interface Props {
  active: boolean
  isCurrent: boolean
  velocity: number
  groupStart: boolean
  size: number
  onMouseDown: () => void
  onMouseEnter: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function StepButton({
  active, isCurrent, velocity, groupStart, size,
  onMouseDown, onMouseEnter, onContextMenu,
}: Props) {
  const cssVars = {
    '--vel': velocity,
    width: size,
    height: size < 20 ? 20 : size < 28 ? 26 : 32,
  } as React.CSSProperties

  return (
    <button
      className={[
        styles.btn,
        active      ? styles.active     : '',
        isCurrent   ? styles.current    : '',
        groupStart  ? styles.groupStart : '',
        size <= 14  ? styles.tiny  : size <= 24 ? styles.small : '',
      ].join(' ')}
      style={cssVars}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
      // Prevent text selection while drag-painting
      onDragStart={(e) => e.preventDefault()}
      aria-pressed={active}
    />
  )
}
