import { useRef } from 'react';
import { assetUrl } from '../../api/client';
import type { PublicTripType } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePinnedScroll } from '../../hooks/useScrollEffects';
import { waLink } from '../../lib/format';
import { ArrowRight, ChatIcon } from '../illustrations/Icons';
import { TripIllustration } from '../illustrations/TripIllustration';

interface Props {
  trips: PublicTripType[];
  whatsapp: string;
  onPlan: (key: string) => void;
}

export function Trips({ trips, whatsapp, onPlan }: Props) {
  const pin = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  usePinnedScroll(pin, track, count, !reduce);

  if (!trips.length) return null;

  return (
    <section id="trips" className={`pin ${reduce ? 'static' : ''}`} ref={pin} aria-labelledby="trips-title">
      <div className="pin-sticky">
        <div className="wrap pin-head">
          <div>
            <p className="caps rv" style={{ margin: '0 0 12px' }}>Pick your kind of trail</p>
            <h2 id="trips-title" className="h2 rv d1">
              Where does your heart <em>want to go?</em>
            </h2>
          </div>
          <div className="pin-bar" aria-hidden="true">
            <div className="pin-count" ref={count} />
          </div>
        </div>
        <div className="track-scroller">
          <div className="track" ref={track}>
            {trips.map((t) => (
              <article className="style-card" key={t.key}>
                {t.image ? (
                  <img className="art" src={assetUrl(t.image.url)} alt={t.image.alt || ''} loading="lazy" width={360} height={240} />
                ) : (
                  <TripIllustration kind={t.illustration} className="art" />
                )}
                <div className="body">
                  <h3>{t.title}</h3>
                  <p>{t.subtitle}</p>
                  <div className="actions">
                    <button type="button" className="go" onClick={() => onPlan(t.key)} aria-label={`Plan a ${t.title} trip`}>
                      Plan this trip <ArrowRight />
                    </button>
                    <a
                      className="wa"
                      href={waLink(whatsapp, t.whatsappMessage || undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ask about ${t.title} on WhatsApp`}
                      title="Ask on WhatsApp"
                    >
                      <ChatIcon size={20} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
