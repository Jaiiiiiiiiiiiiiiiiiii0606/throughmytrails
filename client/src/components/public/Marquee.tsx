import { Fragment } from 'react';

const WORDS = ['Explore', 'Experience', 'Everywhere', 'Flights', 'Hotels', 'Holidays', 'Custom packages'];

export function Marquee() {
  // Two identical halves so translateX(-50%) loops seamlessly.
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <Fragment key={half}>
            {WORDS.map((w) => (
              <Fragment key={w}>
                <span>{w}</span>
                <span className="star">✦</span>
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
