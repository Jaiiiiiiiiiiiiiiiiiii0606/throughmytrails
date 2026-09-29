import type { Service } from '../../api/types';
import { ServiceIcon } from '../illustrations/Icons';

export function Services({ services }: { services: Service[] }) {
  return (
    <section id="services" className="services">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="caps rv" style={{ margin: '0 0 14px' }}>What we do</p>
            <h2 className="h2 rv d1">
              Everything your trip needs, <em>in one place.</em>
            </h2>
          </div>
          <p className="script rv d2 aside">…so you can just enjoy the view</p>
        </div>
        <div className="grid4">
          {services.map((s, i) => (
            <article key={`${s.title}-${i}`} className={`svc rv ${i % 4 ? `d${i % 4}` : ''}`}>
              <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="ico"><ServiceIcon name={s.icon} /></div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
