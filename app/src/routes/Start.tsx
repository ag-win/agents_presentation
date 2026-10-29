import { useNavigate } from 'react-router-dom'

export default function Start() {
  const nav = useNavigate()
  return (
    <main className="start">
      <header className="start__title">
        <h1>AI: From Attention to Agents</h1>
        <p>Choose where to start</p>
      </header>
      <button className="start__btn start__btn--left" onClick={() => nav('/presentation')}>
        <span className="start__btn-label">Enter Presentation</span>
        <span className="start__btn-sub">The talk, slide by slide</span>
      </button>
      <button className="start__btn start__btn--right" onClick={() => nav('/builder')}>
        <span className="start__btn-label">Enter Agent Builder</span>
        <span className="start__btn-sub">Build and explore agentic harnesses</span>
      </button>
    </main>
  )
}
