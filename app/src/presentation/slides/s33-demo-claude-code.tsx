import { LiveDemo } from '../layouts'
import Embed from '../../shared/Embed'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's33', title: 'Live demo: Claude Code on a real task', backup: true }

export default function S33() {
  return (
    <LiveDemo title="Live demo: Claude Code on a real task">
      <p className="muted mono" style={{ fontSize: 28 }}>Multi-file coding task with test-driven feedback</p>
      <p>Plan, touch multiple files, run tests, self-correct on failure. This is the SWE-bench loop in action: write → test → observe failure → revise.</p>
      <Embed name="demo-claude-code" />
    </LiveDemo>
  )
}
