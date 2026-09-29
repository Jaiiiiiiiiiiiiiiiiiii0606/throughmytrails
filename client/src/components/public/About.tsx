import { useRef } from 'react';
import { assetUrl } from '../../api/client';
import type { ImageRef } from '../../api/types';
import { useLocalParallax } from '../../hooks/useParallax';

export function About({ image }: { image: ImageRef | null }) {
  const drift = useRef<HTMLDivElement>(null);
  useLocalParallax(drift, 0.08);

  return (
    <section id="about" className="about">
      <div className="wrap split">
        <div style={{ position: 'relative' }}>
          <div ref={drift}>
            <div className="rv tilt">
              <img
                className="about-img"
                src={image ? assetUrl(image.url) : '/assets/card.jpg'}
                alt={image?.alt || 'Through My Trails business card, front and back'}
                loading="lazy"
                width={image?.width ?? 1100}
                height={image?.height ?? 775}
              />
            </div>
          </div>
        </div>
        <div>
          <p className="caps rv" style={{ margin: '0 0 14px' }}>Hello, traveller</p>
          <h2 className="h2 rv d1">
            <span className="mask"><span>Every trail starts</span></span>
            <span className="mask"><span style={{ transitionDelay: '.12s' }}><em>with a conversation.</em></span></span>
          </h2>
          <p className="lead rv d2">
            Through My Trails is a personal travel planning service. Tell us where you want to go, when, who's coming and what you'd like to spend, and we build the whole trip around it: researched, organised and ready to book.
          </p>
          <p className="lead rv d3">
            No generic packages, no endless tabs. Just a plan that feels like it was made for you, because it was.
          </p>
          <div className="rv d4 signature">
            <span className="script">Nachiket R. Patil</span>
            <span className="caps" style={{ fontSize: 12 }}>Founder</span>
          </div>
        </div>
      </div>
    </section>
  );
}
