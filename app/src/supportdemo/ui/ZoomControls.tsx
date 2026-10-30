/** + / − / Fit buttons (and an optional Follow toggle) for a zoomable board. */
export function ZoomControls({ onZoomIn, onZoomOut, onFit, follow, className = '' }: {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  follow?: { on: boolean; toggle: () => void }
  className?: string
}) {
  return (
    <div className={`szoom__tools szoom__ui ${className}`}>
      {follow && (
        <button type="button" className={follow.on ? 'is-on' : ''} aria-pressed={follow.on} onClick={follow.toggle} title="Keep the box that is running in view">Follow</button>
      )}
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">+</button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out">−</button>
      <button type="button" onClick={onFit}>Fit</button>
    </div>
  )
}
