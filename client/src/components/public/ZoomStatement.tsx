import { useRef } from 'react';
import { useZoomOnScroll } from '../../hooks/useScrollEffects';

export function ZoomStatement() {
  const section = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useZoomOnScroll(section, text);

  return (
    <section className="zoom" ref={section} aria-label="Explore, Experience, Everywhere">
      <div className="zoom-sticky">
        <div className="zoom-text" ref={text}>
          <p className="caps">Through My Trails</p>
          <h2>
            Explore.
            <br />
            <em>Experience.</em>
            <br />
            Everywhere.
          </h2>
        </div>
      </div>
    </section>
  );
}
