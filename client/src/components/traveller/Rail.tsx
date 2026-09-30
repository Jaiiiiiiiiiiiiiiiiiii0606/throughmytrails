import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from './TIcons';

interface Props {
  title?: ReactNode;
  kicker?: string;
  actions?: ReactNode;
  /** Rendered between the heading and the cards, e.g. filters. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  label: string;
  headingLevel?: 'h2' | 'h3';
}

/** Horizontal, snap-scrolling row with previous/next buttons that disable at either end. */
export function Rail({ title, kicker, actions, toolbar, children, className = '', label, headingLevel: H = 'h2' }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className={`rail ${className}`} aria-label={label}>
      {(title || actions) && (
        <div className="rail-head">
          <div>
            {kicker && <p className="caps rail-kicker">{kicker}</p>}
            {title && <H className="rail-title">{title}</H>}
          </div>
          <div className="rail-actions">
            {actions}
            <button type="button" className="rail-arrow" onClick={() => page(-1)} disabled={edges.start} aria-label={`Scroll ${label} back`}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="rail-arrow" onClick={() => page(1)} disabled={edges.end} aria-label={`Scroll ${label} forward`}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      {toolbar}
      <div className="rail-track" ref={track} onScroll={measure} tabIndex={-1}>
        {children}
      </div>
    </section>
  );
}
