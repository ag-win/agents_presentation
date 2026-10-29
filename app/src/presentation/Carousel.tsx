import { useState, type ReactNode } from 'react'

export interface CarouselItem {
  /** Short name shown on the tab. */
  label: string
  /** One line shown under the carousel while this item is active. */
  caption?: string
  node: ReactNode
}

/**
 * Side buttons (wrap around) plus numbered tabs. Used by slides that step through examples
 * without leaving the slide. Mouse / touch only: the deck owns the arrow keys.
 */
export default function Carousel({ items }: { items: CarouselItem[] }) {
  const [i, setI] = useState(0)
  const n = items.length
  const go = (k: number) => setI(((k % n) + n) % n)

  return (
    <div className="carousel">
      <div className="carousel__row">
        <button className="carousel__btn" onClick={() => go(i - 1)} aria-label="Previous example">‹</button>
        <div className="carousel__viewport">
          <div className="carousel__track" style={{ transform: `translateX(-${i * 100}%)` }}>
            {items.map((it, k) => (
              <div key={it.label} className="carousel__item" aria-hidden={k !== i}>{it.node}</div>
            ))}
          </div>
        </div>
        <button className="carousel__btn" onClick={() => go(i + 1)} aria-label="Next example">›</button>
      </div>
      <div className="carousel__tabs">
        {items.map((it, k) => (
          <button key={it.label} className="carousel__tab" aria-current={k === i} onClick={() => go(k)}>
            {k + 1}. {it.label}
          </button>
        ))}
      </div>
      <div className="carousel__caption">{items[i].caption}</div>
    </div>
  )
}
