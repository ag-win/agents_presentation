import type { ComponentType } from 'react'

/**
 * The seam between the deck and the agent builder. A slide drops in
 * <Embed name="agent-loop" /> and the builder registers a component under
 * that name here. Unregistered names render a visible placeholder, so slides
 * can reserve the spot before the component exists.
 */
export const embeds: Record<string, ComponentType<Record<string, unknown>>> = {
  // 'agent-loop': AgentLoopEmbed,
}

export default function Embed({ name, ...props }: { name: string } & Record<string, unknown>) {
  const C = embeds[name]
  if (!C) return <div className="embed-placeholder">Agent builder component: “{name}” (not built yet)</div>
  return <C {...props} />
}
