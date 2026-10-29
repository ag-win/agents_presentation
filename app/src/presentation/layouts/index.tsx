import type { ReactNode } from 'react'

/** Layouts are authored for a 1920x1080 stage; Deck scales the stage to the window. */

export function TitleSlide({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="slide slide--title">
      <h1>{title}</h1>
      {subtitle && <div className="sub">{subtitle}</div>}
    </div>
  )
}

export function StatementSlide({ lines }: { lines: string[] }) {
  return (
    <div className="slide slide--statement">
      {lines.map((l) => (
        <div className="big" key={l}>{l}</div>
      ))}
    </div>
  )
}

export function SectionDivider({ num, title }: { num: string; title: string }) {
  return (
    <div className="slide slide--section">
      <div className="num">{num}</div>
      <div className="name">{title}</div>
    </div>
  )
}

export function ContentSlide({
  title, tag, cite, children,
}: { title: string; tag?: string; cite?: string; children?: ReactNode }) {
  return (
    <div className="slide">
      {tag && <span className="slide__tag">{tag}</span>}
      <h2 className="slide__title">{title}</h2>
      <div className="slide__body">{children}</div>
      {cite && <div className="slide__cite">{cite}</div>}
    </div>
  )
}

export function DiagramSlide({
  title, tag, cite, diagram, children,
}: { title: string; tag?: string; cite?: string; diagram: ReactNode; children?: ReactNode }) {
  return (
    <ContentSlide title={title} tag={tag} cite={cite}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 24 }}>
        {children && <div>{children}</div>}
        <div className="diagram-wrap" style={{ flex: 1, minHeight: 0 }}>{diagram}</div>
      </div>
    </ContentSlide>
  )
}

/** A diagram that owns the whole slide (no title). */
export function FullDiagram({ children }: { children: ReactNode }) {
  return <div className="slide slide--diagram">{children}</div>
}

export function FullBleed({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="slide slide--bleed">
      <img src={`${import.meta.env.BASE_URL}images/${src}`} alt={alt} />
    </div>
  )
}

export function LiveDemo({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="slide">
      <span className="slide__tag">LIVE DEMO</span>
      <h2 className="slide__title">{title}</h2>
      <div className="slide__body">{children}</div>
    </div>
  )
}
