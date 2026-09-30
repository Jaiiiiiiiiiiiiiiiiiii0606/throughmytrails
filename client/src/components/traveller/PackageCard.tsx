import { Link } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import type { PackageCard as Pkg } from '../../api/types';
import { COMPANION_LABELS } from '../../lib/constants';
import { citiesShort, formatINR, plural } from '../../lib/format';
import { MoonIcon, PinIcon } from './TIcons';

export function PackageCard({ p }: { p: Pkg }) {
  const off = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  return (
    <article className="pcard">
      <Link to={`/packages/${p.slug}`} className="pcard-link" aria-label={`${p.title}, ${formatINR(p.price)} per person`}>
        <div className="pcard-strip">
          <span>{p.destination?.name ?? 'Holiday'}</span>
          <span className="dot" aria-hidden="true">•</span>
          <span>
            <MoonIcon size={14} /> {plural(p.nights, 'night')}
          </span>
        </div>
        <div className="pcard-img">
          {p.cover ? <img src={assetUrl(p.cover.url)} alt="" loading="lazy" decoding="async" /> : <span className="pcard-noimg" />}
          {p.badge && <span className="pcard-badge">{p.badge}</span>}
          {off > 0 && <span className="pcard-off">{off}% off</span>}
        </div>
        <div className="pcard-body">
          <h3>{p.title}</h3>
          {p.cities.length > 0 && (
            <p className="pcard-cities">
              <PinIcon size={16} /> {citiesShort(p.cities)}
            </p>
          )}
          <div className="pcard-tags">
            {p.companions.slice(0, 3).map((c) => (
              <span key={c} className="ptag">{COMPANION_LABELS[c]}</span>
            ))}
          </div>
        </div>
        <div className="pcard-foot">
          <div className="pcard-price">
            {off > 0 && <s>{formatINR(p.originalPrice!)}</s>}
            <strong>{formatINR(p.price)}</strong>
            <span>{p.priceNote || 'per person'}</span>
          </div>
          <span className="pcard-cta">View details</span>
        </div>
      </Link>
    </article>
  );
}
