import { Link, useNavigate } from 'react-router-dom';
import { useDestinations } from '../../api/public';
import type { CompanionCard } from '../../api/types';
import { CompanionPicker } from './CompanionPicker';
import { DestinationSearch } from './DestinationSearch';
import { FeaturedDestinations } from './FeaturedDestinations';
import { ArrowRightIcon } from './TIcons';
import '../../theme/traveller.css';

/** Home-page entry into the Explore experience: search, "Who's coming along" and the arched destination rail. */
export function ExploreTeaser({ companions }: { companions?: CompanionCard[] }) {
  const { data } = useDestinations();
  const navigate = useNavigate();
  const items = data?.items ?? [];
  const featured = items.filter((d) => d.collections.includes('featured'));

  return (
    <section id="explore" className="teaser" aria-labelledby="teaser-title">
      <div className="band compact">
        <div className="band-inner">
          <p className="script band-script">Start planning</p>
          <h2 id="teaser-title" className="band-title">Where will your next trail lead?</h2>
          <DestinationSearch destinations={items} placeholder="Search a country, city or place" className="glow" />
          <div className="band-rule" aria-hidden="true" />
          <h3 className="caps band-sub">Who's coming along</h3>
          <CompanionPicker companions={companions} onPick={(c) => navigate(`/plan?companion=${c}`)} />
        </div>
      </div>
      {items.length > 0 && (
        <div className="soft-sun">
          <div className="twrap">
            <FeaturedDestinations items={featured.length ? featured : items.slice(0, 8)} />
            <div className="teaser-more">
              <Link to="/explore" className="btn line">
                Explore all destinations and packages <ArrowRightIcon size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
