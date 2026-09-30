import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDestinations, useSiteContent } from '../../api/public';
import { useTraveller } from '../../auth/TravellerAuth';
import { Footer } from '../../components/public/Footer';
import { CompanionPicker } from '../../components/traveller/CompanionPicker';
import { DestinationCard } from '../../components/traveller/DestinationCard';
import { DestinationSearch } from '../../components/traveller/DestinationSearch';
import { FeaturedDestinations } from '../../components/traveller/FeaturedDestinations';
import { PackagesSection } from '../../components/traveller/PackagesSection';
import { Rail } from '../../components/traveller/Rail';
import { SiteHeader } from '../../components/traveller/SiteHeader';
import { ArrowRightIcon } from '../../components/traveller/TIcons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useScrollToHash } from '../../hooks/useScrollToHash';
import { firstName } from '../../lib/format';
import '../../theme/traveller.css';

export default function ExplorePage() {
  const { data, isLoading, isError, refetch } = useDestinations();
  const { content } = useSiteContent();
  const { user } = useTraveller();
  const navigate = useNavigate();
  useDocumentTitle('Explore destinations');
  useScrollToHash(!!data);

  const items = useMemo(() => data?.items ?? [], [data]);
  const featured = items.filter((d) => d.collections.includes('featured'));
  const rails = (data?.collections ?? []).filter((c) => c.key !== 'featured').map((c) => ({ ...c, items: items.filter((d) => d.collections.includes(c.key)) })).filter((r) => r.items.length);

  return (
    <div className="tsite">
      <SiteHeader tone="dark" />
      <main id="main">
        <section className="band" aria-labelledby="explore-title">
          <div className="band-inner">
            <p className="script band-script">Your next journey awaits</p>
            <h1 id="explore-title" className="band-title">
              Where to next{user?.name ? `, ${firstName(user.name)}` : ''}?
            </h1>
            <DestinationSearch destinations={items} placeholder="Start planning: search a country, city or place" className="glow" />
            <div className="band-rule" aria-hidden="true" />
            <h2 className="caps band-sub">Who's coming along</h2>
            <CompanionPicker companions={content.companions} onPick={(c) => navigate(`/plan?companion=${c}`)} />
          </div>
        </section>

        {isError ? (
          <div className="twrap tempty">
            <p className="serif">We couldn't load destinations just now.</p>
            <button type="button" className="btn dark sm" onClick={() => refetch()}>Try again</button>
          </div>
        ) : isLoading ? (
          <div className="twrap">
            <div className="skeleton-rail" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="dcard arch skeleton-card" />)}
            </div>
          </div>
        ) : (
          <>
            <section className="soft-sun">
              <div className="twrap">
                <FeaturedDestinations items={featured.length ? featured : items.slice(0, 8)} />
              </div>
            </section>

            <section id="packages" className="twrap section">
              <PackagesSection destinations={items} />
            </section>

            {rails.map((r) => (
              <section key={r.key} className="twrap section-tight" id={r.key}>
                <Rail label={r.label} title={r.label} headingLevel="h2">
                  {r.items.map((d) => (
                    <DestinationCard key={d.id} d={d} variant="tile" showPrice />
                  ))}
                </Rail>
              </section>
            ))}

            <section className="twrap section">
              <div className="cta-card">
                <div>
                  <p className="script">Can't decide?</p>
                  <h2>Tell us how you like to travel. We'll map the rest.</h2>
                  <p>Two minutes in the planner, and a real person designs your day-by-day itinerary with a clear budget.</p>
                </div>
                <Link to="/plan" className="btn dark">
                  Start planning <ArrowRightIcon size={18} />
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer contact={content.contact} logo={content.images.logo} base="/" />
    </div>
  );
}
