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
