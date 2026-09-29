import { useRef } from 'react';
import { useTimelineFill } from '../../hooks/useScrollEffects';

const STEPS = [
  { title: 'Share your details', text: 'Your destination, dates, number of travellers and budget. A quick enquiry or WhatsApp message is enough.' },
  { title: 'We research', text: 'Flights, hotels and activities compared and shortlisted, so you skip the hours of tab-hopping.' },
  { title: 'Get your itinerary', text: 'A personalised, day-wise plan with a clear budget breakdown, tweaked until it feels just right.' },
  { title: 'Book with confidence', text: "Everything is lined up and checked. All that's left is to pack your bags." },
];

export function HowItWorks() {
  const list = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  useTimelineFill(list, fill);

  return (
    <section id="how" className="how">
      <div className="wrap split">
        <div className="how-intro">
          <p className="caps rv" style={{ margin: '0 0 14px' }}>How it works</p>
          <h2 className="h2 rv d1">
            From “where to?” to <em>boarding pass.</em>
          </h2>
          <p className="lead rv d2">Four easy steps. You bring the wanderlust; we do the research, the planning and the maths.</p>
          <a className="btn dark rv d3" href="#contact">Start step one</a>
        </div>
        <div>
          <div className="tl" ref={list}>
            <div className="tl-rail" aria-hidden="true">
              <div className="tl-fill" ref={fill} />
            </div>
            <ol>
            {STEPS.map((s, i) => (
              <li key={s.title} className="rv r tl-step">
                <div className="dot" aria-hidden="true">{i + 1}</div>
                <h3><span className="sr-only">Step {i + 1}: </span>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
