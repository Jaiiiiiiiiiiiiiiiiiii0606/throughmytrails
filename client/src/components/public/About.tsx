import { useRef } from 'react';
import { assetUrl } from '../../api/client';
import type { ImageRef } from '../../api/types';
import { useLocalParallax } from '../../hooks/useParallax';
import { ArrowRight } from '../illustrations/Icons';
import { ScrollText } from './ScrollText';

export function About({ image }: { image: ImageRef | null }) {
  const drift = useRef<HTMLDivElement>(null);
  useLocalParallax(drift, 0.08);

  return (
    <section id="about" className="about">
      <div className="wrap split">
        <div style={{ position: 'relative' }}>
          <div ref={drift}>
            <div className="rv tilt">
              <div className="about-frame" data-tilt="6">
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
        </div>
        <div>
          <p className="caps rv" style={{ margin: '0 0 14px' }}>Hello, traveller</p>
          <h2 className="h2 rv d1">
            <span className="mask"><span>Every trail starts</span></span>
            <span className="mask"><span style={{ transitionDelay: '.12s' }}><em>with a conversation.</em></span></span>
          </h2>
          <ScrollText
            className="lead big"
            text="Through My Trails is a personal travel planning service. Tell us where you want to go, when, who's coming and what you'd like to spend, and we build the whole trip around it: researched, organised and ready to book."
          />
          <p className="lead rv d2">
            No generic packages, no endless tabs. Just a plan that feels like it was made for you, because it was.
          </p>
          <a className="text-link rv d3" href="#team">
            Meet the people who plan your trips <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
