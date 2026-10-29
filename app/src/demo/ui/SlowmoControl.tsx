import type { Slowmo } from '../types'

/** Slow-mo toggle plus a 2x-30x "slower" slider. Shared by the demo overlays. */
export function SlowmoControl({ slowmo, onChange }: { slowmo: Slowmo; onChange: (next: Slowmo) => void }) {
  return (
    <div className="demo-slow">
      <button
        className={`demo-btn${slowmo.enabled ? ' is-on' : ''}`}
        aria-pressed={slowmo.enabled}
        onClick={() => onChange({ ...slowmo, enabled: !slowmo.enabled })}
      >
        Slow-mo
      </button>
      {slowmo.enabled && (
        <label className="demo-slider">
          <input
            type="range" min={2} max={30} step={1} value={slowmo.factor}
            onChange={(e) => onChange({ enabled: true, factor: Number(e.target.value) })}
            aria-label="Slow-motion factor"
          />
          <span>{slowmo.factor}× slower</span>
        </label>
      )}
    </div>
  )
}
