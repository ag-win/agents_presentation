import type { ReactNode } from 'react'

/** Small shared visuals used by several slides. All colours come from tokens. */

export function Flow({ steps }: { steps: { title: string; sub?: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {steps.map((s, i) => (
        <div key={s.title} style={{ display: 'contents' }}>
          <div className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 32 }}>{s.title}</div>
            {s.sub && <div className="muted" style={{ fontSize: 24, marginTop: 6 }}>{s.sub}</div>}
          </div>
          {i < steps.length - 1 && <span className="accent" style={{ fontSize: 48 }}>→</span>}
        </div>
      ))}
    </div>
  )
}

export function BigStat({ value, label, sub, children }: { value: string; label: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
      <div className="accent" style={{ fontSize: 150, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 34, fontWeight: 700, marginTop: 12 }}>{label}</div>
      {sub && <div className="muted" style={{ fontSize: 28, marginTop: 6 }}>{sub}</div>}
      {children}
    </div>
  )
}

/** Self-attention illustration: "The cat sat on the mat", arcs between tokens. */
export function AttentionDiagram() {
  const tokens = ['The', 'cat', 'sat', 'on', 'the', 'mat']
  const x = (i: number) => 90 + i * 150
  // [from, to, strong]
  const links: [number, number, boolean][] = [[1, 2, true], [1, 0, true], [2, 5, true], [5, 4, true], [3, 5, false], [0, 4, false], [1, 5, false]]
  return (
    <svg viewBox="0 0 960 330" style={{ width: '100%' }} role="img" aria-label="Self-attention links between the words of 'The cat sat on the mat'">
      {links.map(([a, b, strong], i) => {
        const mx = (x(a) + x(b)) / 2
        const h = 40 + Math.abs(a - b) * 38
        return (
          <path key={i} d={`M ${x(a)} 230 Q ${mx} ${230 - h * 1.6} ${x(b)} 230`} fill="none"
            stroke={strong ? 'var(--accent)' : 'var(--ink-muted)'} strokeWidth={strong ? 5 : 2}
            strokeDasharray={strong ? undefined : '6 6'} opacity={strong ? 1 : 0.7} />
        )
      })}
      {tokens.map((t, i) => (
        <g key={i}>
          <rect x={x(i) - 55} y={236} width={110} height={56} rx={10} fill="var(--card)" stroke="var(--card-border)" strokeWidth={2} />
          <text x={x(i)} y={274} textAnchor="middle" fontSize={30} fontWeight={700} fill="var(--ink)">{t}</text>
        </g>
      ))}
      <line x1={620} y1={22} x2={680} y2={22} stroke="var(--accent)" strokeWidth={5} />
      <text x={692} y={30} fontSize={22} fill="var(--ink)">Strong attention</text>
      <line x1={620} y1={56} x2={680} y2={56} stroke="var(--ink-muted)" strokeWidth={2} strokeDasharray="6 6" />
      <text x={692} y={64} fontSize={22} fill="var(--ink)">Weak attention</text>
    </svg>
  )
}

/** Horizontal two/three-segment bar. widths are relative; they are normalised to 100%. */
export function StackBar({ parts }: { parts: { w: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.w, 0)
  return (
    <div style={{ display: 'flex', height: 44, width: '100%' }}>
      {parts.map((p, i) => <div key={i} style={{ width: `${(p.w / total) * 100}%`, background: p.color }} />)}
    </div>
  )
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 36, fontSize: 24 }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 22, height: 22, background: i.color, display: 'inline-block' }} />{i.label}
        </span>
      ))}
    </div>
  )
}
