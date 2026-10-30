import { agentSession } from '../sharedSession'
import type { Approval } from '../types'

/** "A person must approve": shown while a tool is paused for a human, and what they decided afterwards. */
export function ApprovalCard({ approval, className = '' }: { approval: Approval; className?: string }) {
  const waiting = approval.status === 'waiting'
  return (
    <div className={`ag-approval is-${approval.status} ${className}`} role="group" aria-label="Human approval">
      <h4>{waiting ? 'A person must approve this' : approval.status === 'approved' ? '✓ Approved by a person' : approval.status === 'declined' ? '✗ Declined by a person' : 'No answer: treated as declined'}</h4>
      <p>{approval.summary}</p>
      {waiting && (
        <div className="ag-approval__buttons">
          <button type="button" className="demo-btn is-on" onClick={() => agentSession.decide(true)}>Approve</button>
          <button type="button" className="demo-btn" onClick={() => agentSession.decide(false)}>Decline</button>
        </div>
      )}
      {waiting && <small>The agent is paused until you answer.</small>}
    </div>
  )
}
