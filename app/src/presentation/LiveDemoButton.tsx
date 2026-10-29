/** A clearly visible call to action that opens a slide's live-demo overlay. */
export function LiveDemoButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`live-demo-btn ${className}`} onClick={onClick}>
      <span aria-hidden>▶</span> Live demo
    </button>
  )
}
