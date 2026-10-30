import { useEffect, useState } from 'react'

const KEY = 'presentation-started-at'

/** When the talk started (ms since the epoch), kept in the tab's session storage so a reload does not lose the time. */
let startedAt: number | null = null

function load(): number | null {
  try {
    const stored = Number(sessionStorage.getItem(KEY))
    return stored > 0 ? stored : null
  } catch {
    return null
  }
}

function save(time: number): void {
  try {
    sessionStorage.setItem(KEY, String(time))
  } catch {
    // The timer still works for this page load without storage.
  }
}

/** Start the clock if it is not already running (the deck calls this when the presentation appears). */
export function startTimer(): void {
  startedAt ??= load()
  if (startedAt === null) {
    startedAt = Date.now()
    save(startedAt)
  }
}

/** Start again from zero. */
export function restartTimer(): void {
  startedAt = Date.now()
  save(startedAt)
}

function format(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}

/** A faint elapsed-time clock in the top-left corner for the presenter. Double-click it to start over. */
export function DeckTimer() {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  return (
    <div className="deck__timer" title="Time since the talk started. Double-click to start over." onDoubleClick={() => { restartTimer(); tick((n) => n + 1) }} aria-label={`Elapsed time ${format(elapsed)}`}>
      {format(elapsed)}
    </div>
  )
}
