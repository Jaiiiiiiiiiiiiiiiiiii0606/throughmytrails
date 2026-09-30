import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, assetUrl } from '../../api/client';
import { useDestinations, usePackage, useSiteContent } from '../../api/public';
import { Footer } from '../../components/public/Footer';
import { PackagesSection } from '../../components/traveller/PackagesSection';
import { SiteHeader } from '../../components/traveller/SiteHeader';
import { ArrowRightIcon, CheckIcon, ChevronDown, MoonIcon, PassportIcon, PinIcon, ShieldIcon, SunIcon } from '../../components/traveller/TIcons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { COMPANION_LABELS } from '../../lib/constants';
import { formatINR, plural, waLink } from '../../lib/format';
import '../../theme/traveller.css';

export default function PackagePage() {
  const { slug } = useParams();
  const { data: p, isLoading, error } = usePackage(slug);
  const { data: all } = useDestinations();
  const { content } = useSiteContent();
  const [openDay, setOpenDay] = useState<number | 'all'>(1);
  useDocumentTitle(p?.title);

  if (isLoading) {
    return (
      <div className="tsite">
        <SiteHeader />
        <div className="twrap"><div className="skeleton-hero short" aria-busy="true" /></div>
      </div>
    );
  }
  if (!p) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="tsite">
        <SiteHeader />
        <main className="twrap tempty tall">
          <p className="script">Off the map</p>
          <h1 className="serif">{notFound ? 'This package is no longer available.' : 'Something went wrong loading this page.'}</h1>
          <Link to="/explore#packages" className="btn dark">See all packages</Link>
        </main>
      </div>
    );
  }

  const images = [p.cover, ...p.gallery].filter(Boolean).slice(0, 3) as { url: string; alt: string; credit?: string }[];
  const off = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const isOpen = (day: number) => openDay === 'all' || openDay === day;
  const credits = [p.cover, ...p.gallery].map((a) => a?.credit).filter(Boolean);

  return (
    <div className="tsite">
      <SiteHeader />
      <main id="main" className="twrap pkg">
        <nav className="crumbs dark" aria-label="Breadcrumb">
          <Link to="/explore">Explore</Link> <span aria-hidden="true">/</span>{' '}
          <Link to={`/destinations/${p.destination.slug}`}>{p.destination.name}</Link> <span aria-hidden="true">/</span>{' '}
          <span aria-current="page">Package</span>
        </nav>

        <div className={`pkg-mosaic n${images.length}`}>
          {images.map((im, i) => (
            <img key={i} src={assetUrl(im.url)} alt={i === 0 ? im.alt || p.title : ''} loading={i ? 'lazy' : 'eager'} />
          ))}
          {p.badge && <span className="pcard-badge big">{p.badge}</span>}
        </div>

        <div className="pkg-grid">
          <div className="pkg-main">
            <h1 className="pkg-title">{p.title}</h1>
            <p className="pkg-meta">
              <span><MoonIcon size={18} /> {plural(p.nights, 'night')} / {plural(p.nights + 1, 'day')}</span>
              {p.cities.length > 0 && (
                <span><PinIcon size={18} /> {p.cities.map((c) => `${c.name} (${c.nights}N)`).join(' → ')}</span>
              )}
            </p>
            <div className="pcard-tags">
              {p.companions.map((c) => <span key={c} className="ptag">Great for {COMPANION_LABELS[c].toLowerCase()}</span>)}
            </div>
            {p.summary && <p className="lede">{p.summary}</p>}

            {p.highlights.length > 0 && (
              <section className="pkg-sec">
                <h2>Highlights</h2>
                <ul className="ticks two">
                  {p.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </section>
            )}

            {p.itinerary.length > 0 && (
              <section className="pkg-sec">
                <div className="pkg-sec-head">
                  <h2>Day by day</h2>
                  <button type="button" className="textlink" onClick={() => setOpenDay(openDay === 'all' ? 1 : 'all')}>
                    {openDay === 'all' ? 'Collapse' : 'Expand all'}
                  </button>
                </div>
                <ol className="days">
                  {p.itinerary.map((d) => (
                    <li key={d.day} className={isOpen(d.day) ? 'open' : ''}>
                      <button type="button" aria-expanded={isOpen(d.day)} onClick={() => setOpenDay(isOpen(d.day) && openDay !== 'all' ? 0 : d.day)}>
                        <span className="day-n">Day {d.day}</span>
                        <span className="day-t">{d.title}</span>
                        <ChevronDown size={18} />
                      </button>
                      {isOpen(d.day) && d.description && <p>{d.description}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(p.inclusions.length > 0 || p.exclusions.length > 0) && (
              <section className="pkg-sec incl">
                {p.inclusions.length > 0 && (
                  <div>
                    <h2>What's included</h2>
                    <ul className="ticks">{p.inclusions.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                {p.exclusions.length > 0 && (
                  <div>
                    <h2>Not included</h2>
                    <ul className="crosses">{p.exclusions.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
              </section>
            )}

            <section className="pkg-sec facts inline" aria-label="Good to know">
              {p.destination.bestTime && (
                <div className="fact"><SunIcon size={20} /><span className="caps">Best time</span><strong>{p.destination.bestTime}</strong></div>
              )}
              {p.destination.visa && (
                <div className="fact"><PassportIcon size={20} /><span className="caps">Visa</span><strong>{p.destination.visa}</strong></div>
              )}
            </section>
          </div>

          <aside className="pkg-aside">
            <div className="price-card">
              {off > 0 && <p className="price-was"><s>{formatINR(p.originalPrice!)}</s> <span>{off}% off</span></p>}
              <p className="price-now">{formatINR(p.price)}</p>
              <p className="price-note">{p.priceNote || 'per person'}</p>
              <Link to={`/plan?package=${p.slug}`} className="btn dark block">
                Customise &amp; request <ArrowRightIcon size={18} />
              </Link>
              <a className="btn line block" href={waLink(content.contact.whatsapp, `Hi Through My Trails, I'm interested in "${p.title}".`)} target="_blank" rel="noopener noreferrer">
                Ask on WhatsApp
              </a>
              <ul className="assure">
                <li><CheckIcon size={16} /> No payment to request a quote</li>
                <li><CheckIcon size={16} /> Change dates, hotels or cities freely</li>
                <li><ShieldIcon size={16} /> A real planner replies within 24 hours</li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="section">
          <PackagesSection destinations={all?.items ?? []} initialDestination={p.destination.slug} lockDestination excludeSlug={p.slug} title={`More in ${p.destination.name}`} kicker="Other ways to go" />
        </section>

        {credits.length > 0 && <p className="credits">Photos: {credits.join(' · ')}</p>}
      </main>
      <Footer contact={content.contact} logo={content.images.logo} base="/" />
    </div>
  );
}
