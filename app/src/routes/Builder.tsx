import { Link } from 'react-router-dom'

// Placeholder. The builder's design is decided as we build; components will live in src/builder/.
export default function Builder() {
  return (
    <main className="builder">
      <h1>Agent Builder</h1>
      <p>Coming soon. This is where agentic harnesses will be built and explained.</p>
      <Link to="/">Back to start</Link>
    </main>
  )
}
