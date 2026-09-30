import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePackages } from '../../api/public';
import type { DestinationCard } from '../../api/types';
import { COMPANION_LABELS, COMPANIONS, Companion } from '../../lib/constants';
import { PackageCard } from './PackageCard';
import { Rail } from './Rail';
import { ChevronDown } from './TIcons';

const BANDS = [
  { key: 'under-50k', label: 'Under ₹50K' },
  { key: '50k-1.5l', label: '₹50K to ₹1.5L' },
  { key: '1.5l-2.5l', label: '₹1.5L to ₹2.5L' },
  { key: 'luxury', label: 'Luxury' },
];

interface Props {
  destinations: DestinationCard[];
  initialDestination?: string;
  initialCompanion?: Companion | '';
  title?: string;
  kicker?: string;
  lockDestination?: boolean;
  /** Hide this package (e.g. the one whose page you're on). */
  excludeSlug?: string;
}

/** Packages with a destination dropdown, budget chips and a "who's travelling" filter. */
export function PackagesSection({ destinations, initialDestination = '', initialCompanion = '', title = 'Handpicked holidays', kicker = 'Ready to go', lockDestination, excludeSlug }: Props) {
  const [destination, setDestination] = useState(initialDestination);
  const [band, setBand] = useState('');
  const [companion, setCompanion] = useState<Companion | ''>(initialCompanion);
  const { data, isLoading, isFetching } = usePackages({ destination, band, companion });

  const items = (data?.items ?? []).filter((p) => p.slug !== excludeSlug);

  const filters = (
    <div className="pfilters" role="group" aria-label="Filter packages">
      {!lockDestination && (
        <label className="pselect">
          <span className="sr-only">Destination</span>
          <select value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">All destinations</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      )}
      {BANDS.map((b) => (
        <button key={b.key} type="button" className={`pchip ${band === b.key ? 'on' : ''}`} aria-pressed={band === b.key} onClick={() => setBand(band === b.key ? '' : b.key)}>
          {b.label}
        </button>
      ))}
      <label className="pselect">
        <span className="sr-only">Who's travelling</span>
        <select value={companion} onChange={(e) => setCompanion(e.target.value as Companion | '')}>
          <option value="">Anyone</option>
          {COMPANIONS.map((c) => (
            <option key={c} value={c}>{COMPANION_LABELS[c]}</option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
    </div>
  );

  return (
    <div className={`packages-block ${isFetching ? 'is-fetching' : ''}`}>
      <Rail label="Holiday packages" kicker={kicker} title={title} toolbar={filters}>
        {isLoading
          ? [0, 1, 2].map((i) => <div key={i} className="pcard skeleton-card" aria-hidden="true" />)
          : items.map((p) => <PackageCard key={p.id} p={p} />)}
        {!isLoading && !items.length && (
          <div className="rail-empty">
            <p className="serif">No packages match those filters yet.</p>
            <p>Tell us what you're after and we'll build one around you.</p>
            <Link className="btn dark sm" to={`/plan${destination ? `?destination=${destination}` : ''}`}>Plan a custom trip</Link>
          </div>
        )}
      </Rail>
    </div>
  );
}
