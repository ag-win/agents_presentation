import type { SupportSnapshot } from './types'

/** A board with nothing running, for showing the layout on a slide. */
export const BLANK_SNAPSHOT: SupportSnapshot = {
  message: '', busy: false, nodes: {}, counter: 0, thick: [], routed: null, trace: [], reply: null, toolLog: null,
  error: null, dots: [], slowmo: { enabled: false, factor: 8 }, backend: { state: 'unknown' },
}
