const DAYS = [
  'Arrive, check in, sunset viewpoint and a local dinner',
  'Guided trail in the morning, café stop, old-town walk',
  'Day trip to a nearby lake or beach, evening market',
  'Slow breakfast, souvenir shopping, flight home',
];

const BARS = [
  { label: 'Flights', width: 78, delay: 0.3 },
  { label: 'Stay', width: 62, delay: 0.45 },
  { label: 'Activities', width: 40, delay: 0.6, alt: true },
  { label: 'Food & travel', width: 30, delay: 0.75, alt: true },
];

export function SampleItinerary() {
  return (
    <section className="receive" aria-labelledby="receive-title">
      <div className="wrap split">
        <div>
          <p className="caps rv" style={{ margin: '0 0 14px' }}>What you receive</p>
          <h2 id="receive-title" className="h2 rv d1">
            A plan you can <em>actually follow.</em>
          </h2>
          <p className="lead rv d2" style={{ marginBottom: 26 }}>
            Every trip comes as a clear, day-by-day itinerary with where to stay, what to do and what it will cost, all in one place.
          </p>
          <p className="script rv d3 tagline">Explore · Experience · Everywhere</p>
        </div>
        <div className="itin rv r">
          <div className="itin-head">
            <span className="caps" style={{ fontSize: 12 }}>Sample itinerary</span>
            <img src="/assets/emblem.png" alt="" width={40} height={35} loading="lazy" />
          </div>
          <h3>[Destination] · 4 days</h3>
          {DAYS.map((d, i) => (
            <div className="day" key={d}>
              <span className="d">Day {i + 1}</span>
              <span className="t">{d}</span>
            </div>
          ))}
          <p className="caps" style={{ margin: '22px 0 14px', fontSize: 12 }}>Budget breakdown</p>
          <div className="budget">
            {BARS.map((b) => (
              <div key={b.label} style={{ display: 'contents' }}>
                <span>{b.label}</span>
                <div className="bar" role="img" aria-label={`${b.label}: ${b.width}% of the budget scale`}>
                  <span className={b.alt ? 'alt' : ''} style={{ width: `${b.width}%`, transitionDelay: `${b.delay}s` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
